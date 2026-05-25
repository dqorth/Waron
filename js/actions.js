// All available player influence actions
const ACTIONS = {
  sabotage_food: {
    id: 'sabotage_food',
    name: 'Sabotage Food',
    desc: 'Poison granaries and contaminate crops of a tribe.',
    cost: 30,
    cooldownTicks: 40,
    suspicion: 0.04,
    requiresTarget: true,
    icon: '🌾',
    execute(player, tribe) {
      tribe.sabotageFood(200 + player.ageIndex * 100);
      tribe.damageMorale(0.1);
      Game.eventLog(`${tribe.name}'s food stores are secretly poisoned.`, 'warn');
    }
  },

  eliminate_leader: {
    id: 'eliminate_leader',
    name: 'Eliminate Leader',
    desc: 'Arrange for the tribal leader\'s mysterious death.',
    cost: 80,
    cooldownTicks: 80,
    suspicion: 0.12,
    requiresTarget: true,
    icon: '☠',
    execute(player, tribe) {
      tribe.killLeader();
    }
  },

  plant_agent: {
    id: 'plant_agent',
    name: 'Plant Agent',
    desc: 'Embed a spy within the tribe. Reduces suspicion gain.',
    cost: 50,
    cooldownTicks: 100,
    suspicion: 0.03,
    requiresTarget: true,
    icon: '👤',
    execute(player, tribe) {
      tribe.agentCount = (tribe.agentCount || 0) + 1;
      Game.eventLog(`An agent is embedded in ${tribe.name}. Intelligence flows.`, 'good');
    }
  },

  boost_research: {
    id: 'boost_research',
    name: 'Accelerate Research',
    desc: 'Secretly provide knowledge to boost a tribe\'s technology.',
    cost: 60,
    cooldownTicks: 60,
    suspicion: 0.06,
    requiresTarget: true,
    icon: '📜',
    execute(player, tribe) {
      tribe.boostResearch();
      Game.eventLog(`${tribe.name} experiences a surge of inspiration.`, 'good');
    }
  },

  cause_disease: {
    id: 'cause_disease',
    name: 'Spread Disease',
    desc: 'Release a sickness into the tribe\'s water supply.',
    cost: 70,
    cooldownTicks: 90,
    suspicion: 0.08,
    requiresTarget: true,
    icon: '💀',
    execute(player, tribe) {
      tribe.causeDisease(0.2 + player.ageIndex * 0.05);
    }
  },

  gift_weapons: {
    id: 'gift_weapons',
    name: 'Gift Weapons',
    desc: 'Leave advanced weapons for the tribe to discover.',
    cost: 90,
    cooldownTicks: 70,
    suspicion: 0.07,
    requiresTarget: true,
    icon: '⚔',
    execute(player, tribe) {
      tribe.giftWeapons();
    }
  },

  false_treaty: {
    id: 'false_treaty',
    name: 'Forge False Treaty',
    desc: 'Fabricate a peace treaty to lure one tribe into complacency.',
    cost: 110,
    cooldownTicks: 120,
    suspicion: 0.15,
    requiresTarget: true,
    icon: '📜',
    execute(player, tribe) {
      tribe.damageMorale(0.15);
      tribe.applyDebuff('morale_loss', 0.3);
      tribe.units.forEach(u => u.state = 'idle');
      Game.eventLog(`${tribe.name} falls for a forged peace. Their guard drops.`, 'warn');
    }
  },

  territorial_dispute: {
    id: 'territorial_dispute',
    name: 'Territorial Dispute',
    desc: 'Incite a border conflict to reignite fighting.',
    cost: 100,
    cooldownTicks: 80,
    suspicion: 0.1,
    requiresTarget: true,
    icon: '🗺',
    execute(player, tribe) {
      tribe.morale = Math.min(1, tribe.morale + 0.2);
      tribe._attackTimer = 0;
      Game.eventLog(`Border stones are moved. ${tribe.name} marches to war.`, 'danger');
    }
  },

  incite_riot: {
    id: 'incite_riot',
    name: 'Incite Riot',
    desc: 'Stir internal rebellion. Weakens military temporarily.',
    cost: 85,
    cooldownTicks: 100,
    suspicion: 0.09,
    requiresTarget: true,
    icon: '🔥',
    execute(player, tribe) {
      const killed = Math.floor(tribe.units.length * 0.3);
      tribe.killUnits(killed);
      tribe.res.wood  = Math.max(0, tribe.res.wood  - 40);
      tribe.res.metal = Math.max(0, tribe.res.metal - 30);
      tribe.res.stone = Math.max(0, tribe.res.stone - 20);
      Game.eventLog(`A riot tears through ${tribe.name}. ${killed} warriors fall to infighting.`, 'danger');
    }
  },

  manipulate_weather: {
    id: 'manipulate_weather',
    name: 'Weather Manipulation',
    desc: 'Cause a drought or storm to devastate crops.',
    cost: 150,
    cooldownTicks: 150,
    suspicion: 0.05,
    requiresTarget: true,
    icon: '⛈',
    execute(player, tribe) {
      tribe.sabotageFood(500 + player.ageIndex * 200);
      tribe.applyDebuff('food', 0.6);
      Game.eventLog(`A terrible drought strikes ${tribe.name}'s lands.`, 'danger');
    }
  },

  kidnap_scientist: {
    id: 'kidnap_scientist',
    name: 'Kidnap Scholar',
    desc: 'Steal a tribe\'s brightest mind, slowing their tech.',
    cost: 120,
    cooldownTicks: 90,
    suspicion: 0.1,
    requiresTarget: true,
    icon: '🧠',
    execute(player, tribe) {
      tribe.applyDebuff('research_slow', 0.5);
      player.knowledge += 20 + player.ageIndex * 10;
      Game.eventLog(`A scholar is taken from ${tribe.name}. Their progress slows.`, 'warn');
    }
  },

  forge_evidence: {
    id: 'forge_evidence',
    name: 'Forge Evidence',
    desc: 'Plant false evidence of treachery between the tribes.',
    cost: 130,
    cooldownTicks: 110,
    suspicion: 0.14,
    requiresTarget: false,
    icon: '📋',
    execute(player, tribeA, tribeB) {
      tribeA.morale = Math.min(1, tribeA.morale + 0.15);
      tribeB.morale = Math.min(1, tribeB.morale + 0.15);
      tribeA._attackTimer = 0;
      tribeB._attackTimer = 0;
      Game.eventLog(`Forged letters inflame both tribes. War intensifies.`, 'danger');
    }
  },

  poison_wells: {
    id: 'poison_wells',
    name: 'Poison Wells',
    desc: 'Contaminate water sources, spreading sickness slowly.',
    cost: 95,
    cooldownTicks: 120,
    suspicion: 0.07,
    requiresTarget: true,
    icon: '💧',
    execute(player, tribe) {
      tribe.causeDisease(0.15 + player.ageIndex * 0.03);
      tribe.sabotageFood(100);
    }
  },

  corrupt_general: {
    id: 'corrupt_general',
    name: 'Corrupt General',
    desc: 'Bribe a general to betray their tribe\'s battle plans.',
    cost: 160,
    cooldownTicks: 100,
    suspicion: 0.13,
    requiresTarget: true,
    icon: '💰',
    execute(player, tribe) {
      tribe.leader.strength = Math.max(0.1, tribe.leader.strength - 0.3);
      tribe.killUnits(Math.floor(tribe.units.length * 0.2));
      Game.eventLog(`${tribe.name}'s general is corrupted. Their tactics fail.`, 'warn');
    }
  },

  inspire_prophet: {
    id: 'inspire_prophet',
    name: 'Inspire Prophet',
    desc: 'Plant a false prophet to unite a tribe against the other.',
    cost: 140,
    cooldownTicks: 130,
    suspicion: 0.08,
    requiresTarget: true,
    icon: '🔮',
    execute(player, tribe) {
      tribe.morale = Math.min(1, tribe.morale + 0.35);
      tribe._attackTimer = 0;
      Game.eventLog(`A prophet rises in ${tribe.name}, preaching holy war.`, 'warn');
    }
  },

  plague_release: {
    id: 'plague_release',
    name: 'Release Plague',
    desc: 'A catastrophic disease that devastates both population and morale.',
    cost: 250,
    cooldownTicks: 200,
    suspicion: 0.1,
    requiresTarget: true,
    icon: '🦠',
    execute(player, tribe) {
      tribe.causeDisease(0.35 + player.ageIndex * 0.05);
      tribe.damageMorale(0.25);
    }
  },

  // ── Fixed: uses drainResources() instead of broken setter ──
  economic_sabotage: {
    id: 'economic_sabotage',
    name: 'Economic Sabotage',
    desc: 'Disrupt trade and burn resource stores.',
    cost: 180,
    cooldownTicks: 120,
    suspicion: 0.1,
    requiresTarget: true,
    icon: '💸',
    execute(player, tribe) {
      tribe.drainResources(300);
      tribe.res.food = Math.max(0, tribe.res.food - 300);
      Game.eventLog(`${tribe.name}'s trade routes collapse. Resources dwindle.`, 'danger');
    }
  },

  spy_network: {
    id: 'spy_network',
    name: 'Spy Network',
    desc: 'Establish a shadow network. Reduces all future suspicion gain.',
    cost: 300,
    cooldownTicks: 300,
    suspicion: 0.05,
    requiresTarget: false,
    icon: '🕵',
    execute(player, tribeA, tribeB) {
      player.suspicionA = Math.max(0, player.suspicionA - 0.15);
      player.suspicionB = Math.max(0, player.suspicionB - 0.15);
      Game.eventLog(`A spy network is established. The shadows grow deeper.`, 'good');
    }
  },

  gunpowder_accident: {
    id: 'gunpowder_accident',
    name: 'Munitions Accident',
    desc: 'Sabotage a tribe\'s weapons cache — catastrophic explosion.',
    cost: 200,
    cooldownTicks: 150,
    suspicion: 0.12,
    requiresTarget: true,
    icon: '💥',
    execute(player, tribe) {
      tribe.killUnits(Math.floor(tribe.units.length * 0.4));
      // Fixed: look for fort or capitol (FORTRESS/CITY don't exist in this game)
      const bld = tribe.buildings.find(b => b.type === CONFIG.ENTITY.FORT || b.type === CONFIG.ENTITY.CAPITOL);
      if (bld) bld.hp = Math.max(1, bld.hp - bld.maxHp * 0.5);
      Game.eventLog(`An explosion tears through ${tribe.name}'s arsenal!`, 'danger');
    }
  },

  navigation_error: {
    id: 'navigation_error',
    name: 'Mislead Expedition',
    desc: 'Corrupt maps to send an army into impassable terrain.',
    cost: 120,
    cooldownTicks: 100,
    suspicion: 0.08,
    requiresTarget: true,
    icon: '🗺',
    execute(player, tribe) {
      const lost = Math.floor(tribe.units.length * 0.25);
      tribe.killUnits(lost);
      Game.eventLog(`${tribe.name}'s army wanders off the map. ${lost} warriors lost.`, 'danger');
    }
  },

  // ── Fixed: uses drainResources() ──
  religious_schism: {
    id: 'religious_schism',
    name: 'Religious Schism',
    desc: 'Split the tribe\'s faith. Internal fighting erupts.',
    cost: 170,
    cooldownTicks: 140,
    suspicion: 0.09,
    requiresTarget: true,
    icon: '✝',
    execute(player, tribe) {
      const factions = Math.floor(tribe.units.length * 0.3);
      tribe.killUnits(factions);
      tribe.damageMorale(0.2);
      tribe.drainResources(100);
      Game.eventLog(`${tribe.name} fractures along religious lines. Civil war brews.`, 'danger');
    }
  },

  // ── Fixed: uses drainResources() ──
  factory_sabotage: {
    id: 'factory_sabotage',
    name: 'Industrial Sabotage',
    desc: 'Destroy production facilities. Tech regresses.',
    cost: 280,
    cooldownTicks: 180,
    suspicion: 0.14,
    requiresTarget: true,
    icon: '🏭',
    execute(player, tribe) {
      tribe.techLevel = Math.max(1, tribe.techLevel - 2);
      tribe.drainResources(400);
      Game.eventLog(`${tribe.name}'s industry burns. Technology is set back.`, 'danger');
    }
  },

  propaganda: {
    id: 'propaganda',
    name: 'Mass Propaganda',
    desc: 'Flood a tribe with war propaganda. Extreme aggression follows.',
    cost: 220,
    cooldownTicks: 130,
    suspicion: 0.11,
    requiresTarget: true,
    icon: '📢',
    execute(player, tribe) {
      tribe.morale = 1.0;
      tribe._attackTimer = 0;
      tribe._militaryTimer = 0;
      Game.eventLog(`${tribe.name} is consumed by war fever. They attack without mercy.`, 'danger');
    }
  },

  arms_deal: {
    id: 'arms_deal',
    name: 'Secret Arms Deal',
    desc: 'Supply a weakened tribe with advanced weaponry.',
    cost: 350,
    cooldownTicks: 200,
    suspicion: 0.1,
    requiresTarget: true,
    icon: '🔫',
    execute(player, tribe) {
      tribe.giftWeapons();
      tribe.techLevel = Math.min(tribe.age.tribeMaxTech, tribe.techLevel + 3);
      Game.eventLog(`${tribe.name} receives a secret arms shipment.`, 'warn');
    }
  },

  nuclear_scare: {
    id: 'nuclear_scare',
    name: 'Nuclear Incident',
    desc: 'A staged nuclear threat sends both tribes into defensive postures.',
    cost: 500,
    cooldownTicks: 300,
    suspicion: 0.08,
    requiresTarget: false,
    icon: '☢',
    execute(player, tribeA, tribeB) {
      tribeA.units.forEach(u => u.state = 'idle');
      tribeB.units.forEach(u => u.state = 'idle');
      tribeA.morale = 0.5;
      tribeB.morale = 0.5;
      Game.eventLog(`A nuclear incident freezes both sides in mutual terror.`, 'warn');
    }
  },

  cyber_disruption: {
    id: 'cyber_disruption',
    name: 'Cyber Attack',
    desc: 'Disrupt communications and military coordination.',
    cost: 400,
    cooldownTicks: 200,
    suspicion: 0.09,
    requiresTarget: true,
    icon: '💻',
    execute(player, tribe) {
      tribe._attackTimer += 30;
      tribe._buildTimer += 30;
      tribe.applyDebuff('research_slow', 0.4);
      Game.eventLog(`${tribe.name}'s systems are disrupted by unknown assailants.`, 'danger');
    }
  },

  // ── Fixed: uses drainResources() ──
  satellite_interference: {
    id: 'satellite_interference',
    name: 'Satellite Blackout',
    desc: 'Knock out military satellite systems of one tribe.',
    cost: 600,
    cooldownTicks: 250,
    suspicion: 0.07,
    requiresTarget: true,
    icon: '🛰',
    execute(player, tribe) {
      tribe.killUnits(Math.floor(tribe.units.length * 0.5));
      tribe.drainResources(600);
      Game.eventLog(`${tribe.name}'s satellite network goes dark. Their forces scatter.`, 'danger');
    }
  },
};

function getActionsForAge(age) {
  return age.actions.map(id => ACTIONS[id]).filter(Boolean);
}
