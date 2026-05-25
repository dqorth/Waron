import os
import re
import json
import time
from collections import defaultdict

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

JSDOC_TEMPLATE = """/**
 * One-line summary.
 * 
 * @description MANDATORY detailed explanation (2-5 sentences).
 * 
 * @workflow
 * 1. Specific numbered steps
 * 2. Include conditionals and loops
 * 
 * @param {Type} name - Description
 * @returns {Type} Description
 * 
 * @dependencies stateManager.get(), etc.
 * @modifies What state/DOM changes
 * @triggers When/how called
 * @performance O(n) complexity notes
 */"""

FUNC_REGEX = re.compile(
    r'^(?:\s*)(?:export\s+)?(?:async\s+)?(?:function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(|const\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=\s*(?:async\s+)?\(|([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\([^)]*\)\s*\{)',
    re.MULTILINE
)

def generate_jsdocs_via_api(file_content, filename):
    if not HAS_GENAI:
        print("WARNING: google-generativeai package is not installed. Run `pip install google-generativeai`. Using blank template.")
        return {}
        
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("WARNING: GEMINI_API_KEY environment variable not set. Using blank template.")
        return {}
        
    genai.configure(api_key=api_key)
    model_name = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    model = genai.GenerativeModel(model_name)
    
    prompt = f"""
    You are an expert JavaScript documentation generator.
    Analyze the following JavaScript file named '{filename}'.
    
    I need you to generate a specific, highly-detailed JSDoc for EVERY function defined in this file.
    
    The JSDoc MUST exactly follow this template format, filled in with specific details derived from the code:
    /**
     * [One-line summary]
     * 
     * @description [MANDATORY detailed explanation (2-5 sentences).]
     * 
     * @workflow
     * 1. [Specific numbered steps]
     * 2. [Include conditionals and loops]
     * 
     * @param {{Type}} name - [Description]
     * @returns {{Type}} [Description]
     * 
     * @dependencies [stateManager.get(), etc.]
     * @modifies [What state/DOM changes]
     * @triggers [When/how called]
     * @performance [O(n) complexity notes]
     */
     
    CRITICAL: Output ONLY a valid JSON object. Do not output any markdown formatting or extra text.
    The keys of the JSON object must be the exact function names.
    The values must be the complete, formatted JSDoc string for that function (including the /** and */).
    
    JavaScript File Content:
    {file_content}
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Remove markdown code blocks if the model accidentally included them
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
            
        return json.loads(text.strip())
    except Exception as e:
        print(f"Error generating JSDocs for {filename}: {e}")
        return {}

def parse_and_inject_jsdocs(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    lines = content.split('\n')
    
    # Pre-generate specific JSDocs for this file via Gemini
    generated_docs = generate_jsdocs_via_api(content, os.path.basename(filepath))
    
    functions = {}
    modified_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        match = FUNC_REGEX.match(line)
        
        if match and not line.strip().startswith('//'):
            func_name = next(g for g in match.groups() if g is not None)
            
            if func_name in ['if', 'for', 'while', 'switch', 'catch', 'return']:
                modified_lines.append(line)
                i += 1
                continue
            
            has_jsdoc = False
            doc_lines = []
            if len(modified_lines) > 0:
                prev_idx = len(modified_lines) - 1
                while prev_idx >= 0 and modified_lines[prev_idx].strip() == '':
                    prev_idx -= 1
                    
                if prev_idx >= 0 and modified_lines[prev_idx].strip() == '*/':
                    has_jsdoc = True
                    doc_start = prev_idx
                    while doc_start >= 0 and not modified_lines[doc_start].strip().startswith('/**'):
                        doc_start -= 1
                    if doc_start >= 0:
                        doc_lines = [l + '\n' for l in modified_lines[doc_start:prev_idx+1]]
            
            is_blank_template = False
            if has_jsdoc:
                doc_str = "".join(doc_lines)
                if "MANDATORY detailed explanation" in doc_str:
                    is_blank_template = True

            # If missing OR it's the blank template, we inject the specific one
            if not has_jsdoc or is_blank_template:
                indent = line[:len(line) - len(line.lstrip())]
                
                specific_doc = generated_docs.get(func_name)
                if specific_doc:
                    # Use the AI-generated specific doc
                    doc_lines = [indent + l + '\n' for l in specific_doc.split('\n')]
                else:
                    # Fallback to blank template
                    doc_lines = [indent + l + '\n' for l in JSDOC_TEMPLATE.split('\n')]
                
                if is_blank_template:
                    # Remove the old blank template lines from modified_lines before adding the new one
                    while len(modified_lines) > 0 and not modified_lines[-1].strip().startswith('/**'):
                        modified_lines.pop()
                    if len(modified_lines) > 0:
                        modified_lines.pop() # Remove the /** line
                        
                # Add the new doc lines
                for l in doc_lines:
                    modified_lines.append(l.rstrip())
                
            docstring = "".join(doc_lines)
            functions[func_name] = {
                'docstring': docstring
            }
            
        modified_lines.append(line)
        i += 1
        
    new_content = "\n".join(modified_lines)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    return functions

def categorize_path(filepath: str, root_dir: str) -> str:
    path_parts = filepath.split(os.sep)
    if 'js' in path_parts:
        return 'JavaScript App'
    elif 'css' in path_parts:
        return 'Styles'
    else:
        return 'Core / Root'

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    docs_dir = os.path.join(root_dir, 'documentation')
    
    if not os.path.exists(docs_dir):
        os.makedirs(docs_dir)
        
    output_file = os.path.join(docs_dir, 'CODEBASE_MAP.md')
    
    categories = defaultdict(dict)
    
    print("Starting codebase scan...")
    if not os.environ.get("GEMINI_API_KEY"):
        print("Note: Export GEMINI_API_KEY to enable AI-powered JSDoc generation.")
    print("      You can also export GEMINI_MODEL (e.g., 'gemini-2.5-pro') to specify the model (defaults to gemini-2.5-flash).")
        
    for dirpath, _, filenames in os.walk(root_dir):
        if '.git' in dirpath or 'node_modules' in dirpath:
            continue
            
        for file in filenames:
            if file.endswith('.js'):
                filepath = os.path.join(dirpath, file)
                print(f"Processing {file}...")
                category = categorize_path(filepath, root_dir)
                rel_path = os.path.relpath(filepath, root_dir)
                
                funcs = parse_and_inject_jsdocs(filepath)
                categories[category][rel_path] = funcs
                # Sleep briefly to avoid hitting rate limits if using API
                if HAS_GENAI and os.environ.get("GEMINI_API_KEY"):
                    time.sleep(2)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# Waron - Codebase Map\n\n")
        f.write("This document provides a verbose breakdown of the codebase, its categories, functions, and specific JSDocs.\n\n")
        
        for category, files in categories.items():
            if not files:
                continue
                
            f.write(f"## Category: {category}\n\n")
            
            for rel_path, funcs in files.items():
                if not funcs:
                    continue
                    
                f.write(f"### File: `{rel_path}`\n\n")
                f.write("#### Functions\n\n")
                
                for func_name, info in funcs.items():
                    f.write(f"**Function: `{func_name}`**\n")
                    f.write(f"```javascript\n{info['docstring'].strip()}\n```\n\n")
                    
                f.write("---\n\n")

    print(f"Codebase map generated and missing JSDocs injected successfully at: {output_file}")

if __name__ == '__main__':
    main()
