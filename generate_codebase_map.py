import os
import re
from collections import defaultdict

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

# Matches: function name(...) or const name = (...) => or name(...) {
# This is a basic regex and might not catch all edge cases, but covers the standard formats in the project.
FUNC_REGEX = re.compile(
    r'^(?:\s*)(?:export\s+)?(?:async\s+)?(?:function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(|const\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=\s*(?:async\s+)?\(|([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\([^)]*\)\s*\{)',
    re.MULTILINE
)

def parse_and_inject_jsdocs(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    functions = {}
    modified_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        match = FUNC_REGEX.match(line)
        
        if match and not line.strip().startswith('//'):
            # Extract function name
            func_name = next(g for g in match.groups() if g is not None)
            
            # Skip common keywords or control structures masquerading as functions
            if func_name in ['if', 'for', 'while', 'switch', 'catch', 'return']:
                modified_lines.append(line)
                i += 1
                continue
            
            # Check if there is a JSDoc block right above it
            has_jsdoc = False
            doc_lines = []
            if len(modified_lines) > 0:
                prev_idx = len(modified_lines) - 1
                # Skip empty lines above function
                while prev_idx >= 0 and modified_lines[prev_idx].strip() == '':
                    prev_idx -= 1
                    
                if prev_idx >= 0 and modified_lines[prev_idx].strip() == '*/':
                    has_jsdoc = True
                    # Extract the docblock
                    doc_start = prev_idx
                    while doc_start >= 0 and not modified_lines[doc_start].strip().startswith('/**'):
                        doc_start -= 1
                    if doc_start >= 0:
                        doc_lines = modified_lines[doc_start:prev_idx+1]
            
            if not has_jsdoc:
                # Inject JSDoc template
                indent = line[:len(line) - len(line.lstrip())]
                template_lines = [indent + l + '\n' for l in JSDOC_TEMPLATE.split('\n')]
                modified_lines.extend(template_lines)
                doc_lines = template_lines
                
            docstring = "".join(doc_lines)
            functions[func_name] = {
                'docstring': docstring
            }
            
        modified_lines.append(line)
        i += 1
        
    # Write back if modified
    new_content = "".join(modified_lines)
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
    
    for dirpath, _, filenames in os.walk(root_dir):
        if '.git' in dirpath or 'node_modules' in dirpath:
            continue
            
        for file in filenames:
            if file.endswith('.js'):
                filepath = os.path.join(dirpath, file)
                category = categorize_path(filepath, root_dir)
                rel_path = os.path.relpath(filepath, root_dir)
                
                funcs = parse_and_inject_jsdocs(filepath)
                categories[category][rel_path] = funcs

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# Waron - Codebase Map\n\n")
        f.write("This document provides a verbose breakdown of the codebase, its categories, functions, and JSDoc requirements.\n\n")
        
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
