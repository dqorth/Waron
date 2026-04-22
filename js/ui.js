class UI {
  constructor() {
    this._selectedAction = null;
    this._selectedTarget = null;

    this._notifContainer = this._createNotifContainer();
    this._tooltip = this._createTooltip();

    this._bindSpeedButtons();
    this._bindStartButton();
    this._bindModalButtons();
  }

  _createNotifContainer() {
    const div = document.createElement('div');
    div.id = 'notifications';
    document.getElementById('game-container').appendChild(div);
    return div;
  }

  _createTooltip() {
    const div = document.createElement('div');
    div.id = 'tooltip';
    document.getElementById('game-container').appendChild(div);
    return div;
  }

  _bindSpeedButtons() {
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Game.setSpeed(parseInt(btn.dataset.speed));
      });
    });
  }

  _bindStartButton() {
    document.getElementById('btn-start').addEventListener('click', () => {
      document.getElementById('start-screen').classList.add('hidden');
      Game.start();
    });
    document.getElementById('btn-restart').addEventListener('click', () => {
      document.getElementById('gameover-screen').classList.add('hidden');
      document.getElementById('start-screen').classList.remove('hidden');
      Game.reset();
    });
  }

  _bindModalButtons() {
    document.getElementById('modal-cancel').addEventListener('click', () => {
      this._closeModal();
    });

    document.getElementById('modal-confirm').addEventListener('click', () => {
      this._executeAction();
    });

    document.getElementById('target-a').addEventListener('click', () => {
      this._selectedTarget = 'a';
      document.getElementById('target-a').classList.add('selected');
      document.getElementById('target-b').classList.remove('selected');
    });

    document.getElementById('target-b').addEventListener('click', () => {
      this._selectedTarget = 'b';
      document.getElementById('target-b').classList.add('selected');
      document.getElementById('target-a').classList.remove('selected');
    });
  }

  _executeAction() {
    if (!this._selectedAction) return;

    const action = this._selectedAction;
    const player = Game.player;
    const tribeA = Game.tribeA;
    const tribeB = Game.tribeB;

    if (!player.canAfford(action.cost)) {
      this.notify('Not enough Essence.', 'warn');
      return;
    }

    if (action.requiresTarget && !this._selectedTarget) {
      this.notify('Select a target tribe first.', 'warn');
      return;
    }

    // Execute
    if (action.requiresTarget) {
      const tribe = this._selectedTarget === 'a' ? tribeA : tribeB;
      action.execute(player, tribe);
      player.addSuspicion(this._selectedTarget, action.suspicion);
    } else {
      action.execute(player, tribeA, tribeB);
      player.addSuspicion('a', action.suspicion * 0.5);
      player.addSuspicion('b', action.suspicion * 0.5);
    }

    player.spendEssence(action.cost);
    player.setCooldown(action.id, action.cooldownTicks);
    player.actionsUsed++;

    // Update territory after building changes
    Game.world.updateTerritory(tribeA, tribeB);

    this._closeModal();
    this.updateActionsList(player);
  }

  _closeModal() {
    document.getElementById('action-modal').classList.add('hidden');
    document.getElementById('target-a').classList.remove('selected');
    document.getElementById('target-b').classList.remove('selected');
    this._selectedAction = null;
    this._selectedTarget = null;
  }

  openActionModal(action) {
    this._selectedAction = action;
    this._selectedTarget = null;

    document.getElementById('modal-title').textContent = action.name.toUpperCase();
    document.getElementById('modal-desc').textContent = action.desc;
    document.getElementById('modal-cost').textContent = `Cost: ${action.cost} Essence  |  Suspicion: +${(action.suspicion*100).toFixed(0)}%`;

    const targetSection = document.getElementById('modal-targets');
    const targetLabel = document.getElementById('modal-target-label');
    if (action.requiresTarget) {
      targetSection.style.display = 'flex';
      targetLabel.style.display = 'block';
    } else {
      targetSection.style.display = 'none';
      targetLabel.style.display = 'none';
      this._selectedTarget = null;
    }

    document.getElementById('target-a').classList.remove('selected');
    document.getElementById('target-b').classList.remove('selected');
    document.getElementById('action-modal').classList.remove('hidden');
  }

  updateHUD(player, tribeA, tribeB, cal) {
    // Support legacy callers that pass (player, tribeA, tribeB, day, year).
    if (typeof cal === 'number') {
      // old signature: cal=day, 5th arg=year — reconstruct a minimal cal object
      const yr = arguments[4] || 1;
      cal = { day: cal, dayInMonth: cal, month: 1, monthName: 'Ashveil', year: yr,
               season: 'spring', seasonName: 'Spring', timePeriodName: 'Day' };
    }
    // Balance bar
    const totalPower = tribeA.power + tribeB.power;
    const fracA = totalPower > 0 ? tribeA.power / totalPower : 0.5;
    const fracB = 1 - fracA;
    document.getElementById('balance-fill-a').style.width = (fracA * 100) + '%';
    document.getElementById('balance-fill-b').style.width = (fracB * 100) + '%';

    // Player stats
    document.getElementById('stat-age').textContent = player.age.name;
    document.getElementById('stat-essence').textContent = Math.floor(player.essence);
    document.getElementById('stat-knowledge').textContent = Math.floor(player.knowledge);
    document.getElementById('age-progress-fill').style.width = (player.getAgeProgressFraction() * 100) + '%';

    const suspA = Math.round(player.suspicionA * 100);
    const suspB = Math.round(player.suspicionB * 100);
    const sA = document.getElementById('stat-susp-a');
    const sB = document.getElementById('stat-susp-b');
    sA.textContent = suspA + '%';
    sB.textContent = suspB + '%';
    sA.style.color = suspA > 60 ? '#e04030' : suspA > 30 ? '#c08020' : '#c8c0a8';
    sB.style.color = suspB > 60 ? '#e04030' : suspB > 30 ? '#c08020' : '#c8c0a8';

    // Tribe A
    document.getElementById('a-pop').textContent = tribeA.population.toLocaleString();
    document.getElementById('a-mil').textContent = tribeA.military;
    document.getElementById('a-tech').textContent = `${tribeA.techLevel} (${tribeA.age.name.split(' ')[0]})`;
    document.getElementById('a-terr').textContent = Game.world.countTerritory('a') + ' tiles';
    const rA = tribeA.res || {};
    document.getElementById('a-res').textContent =
      `🪵${Math.floor(rA.wood||0)}  🌾${Math.floor(rA.food||0)}  ⚙${Math.floor(rA.metal||0)}  🪨${Math.floor(rA.stone||0)}`;

    // Tribe B
    document.getElementById('b-pop').textContent = tribeB.population.toLocaleString();
    document.getElementById('b-mil').textContent = tribeB.military;
    document.getElementById('b-tech').textContent = `${tribeB.techLevel} (${tribeB.age.name.split(' ')[0]})`;
    document.getElementById('b-terr').textContent = Game.world.countTerritory('b') + ' tiles';
    const rB = tribeB.res || {};
    document.getElementById('b-res').textContent =
      `🪵${Math.floor(rB.wood||0)}  🌾${Math.floor(rB.food||0)}  ⚙${Math.floor(rB.metal||0)}  🪨${Math.floor(rB.stone||0)}`;

    // Time + weather
    const weatherType = (Game.world && Game.world.weather && Game.world.weather.type)
      ? Game.world.weather.type
      : 'sunshine';
    document.getElementById('time-display').textContent =
      `${cal.timePeriodName}  •  Day ${cal.dayInMonth}/${cal.monthName} (Mo.${cal.month})  •  ${cal.seasonName}  •  Year ${cal.year}  •  ${weatherType}`;
    document.getElementById('age-display').textContent = getAgeByYear(cal.year).name.toUpperCase();
  }

  updateActionsList(player) {
    const list = document.getElementById('actions-list');
    list.innerHTML = '';

    const actions = getActionsForAge(player.age);
    actions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = 'action-btn';

      const onCooldown = player.isOnCooldown(action.id);
      const canAfford = player.canAfford(action.cost);

      if (onCooldown) btn.classList.add('on-cooldown');
      btn.disabled = onCooldown || !canAfford;

      const cdTicks = player.cooldowns[action.id] || 0;
      btn.innerHTML = `
        <span class="a-name">${action.name}</span>
        <span class="a-cost">Essence: ${action.cost} | Susp: +${(action.suspicion*100).toFixed(0)}%</span>
        ${onCooldown ? `<span class="a-cooldown">Cooldown: ${cdTicks} ticks</span>` : ''}
      `;

      btn.title = action.desc;
      btn.addEventListener('click', () => {
        if (!btn.disabled) this.openActionModal(action);
      });

      list.appendChild(btn);
    });
  }

  notify(msg, type = '') {
    const div = document.createElement('div');
    div.className = `notif${type ? ' ' + type : ''}`;
    div.textContent = msg;
    this._notifContainer.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }

  addLog(msg, type = '') {
    const log = document.getElementById('event-log');
    const entry = document.createElement('div');
    entry.className = `log-entry${type ? ' log-' + type : ''}`;
    entry.textContent = msg;
    log.prepend(entry);

    // Keep only last 60 entries
    while (log.children.length > 60) log.removeChild(log.lastChild);
  }

  showGameOver(reason, stats) {
    document.getElementById('gameover-subtitle').innerHTML = reason;
    document.getElementById('gameover-stats').innerHTML = stats;
    document.getElementById('gameover-screen').classList.remove('hidden');
  }
}
