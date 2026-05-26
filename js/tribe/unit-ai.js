// Unit AI: per-unit behavior, movement, combat, defection, retreat.
class TribeUnitAI {
  /**
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
   */
  constructor(tribe) {
    this.tribe = tribe;
  }

  /**
   * Iterates through all tribe units, updating their state, movement, and combat actions.
   *
   * @description This comprehensive private method is the core AI logic for individual units. It processes movement timers, handles hunger-driven movement, and defines specific behaviors for warriors, leaders (marching, fighting, retreating, defecting), workers (resource gathering, repairing, planting), scouts (patrolling, detecting enemies), and normal units (wandering). It also manages unit health, attacks, and despawning upon death or defection.
   *
   * @workflow
   * 1. Iterates backwards through `this.units` array:
   *    a. Selects unit `u`.
   *    b. Ensures `u.stats` are initialized by calling `this._rollUnitStats()`.
   *    c. Calculates `baseMI` (move interval) based on unit type.
   *    d. Retrieves `weatherMult` from `this._world.weatherMods`.
   *    e. Gets the tile `u` is on and determines `roadDiv` if a road is present.
   *    f. Calls `this._agilityFactor(stats)` to get an agility-based multiplier.
   *    g. Calculates `moveInterval` (clamped between 1 and `baseMI` * multipliers).
   *    h. Increments `u._moveTimer`.
   *    i. Sets `canAct` if `u._moveTimer` meets `moveInterval`. If `canAct`, resets `u._moveTimer`.
   *    j. If `u` has `_pauseTicks` and it's greater than 0:
   *       i. Decrements `u._pauseTicks` and continues to next unit.
   *    k. If `u.state` is not 'fighting' and `canAct`:
   *       i. If a random check passes (chance based on unit type), sets `u._pauseTicks` for a short duration and continues.
   *    l. If `u` has `_hungerTarget` and `u.state` is not 'fighting':
   *       i. If `canAct`, calls `this._stepTowardVaried(u, u._hungerTarget.x, u._hungerTarget.y)`.
   *       ii. If `u` is close to `_hungerTarget`, clears `u._hungerTarget` and continues.
   *    m. If `u.type` is `WARRIOR` or `LEADER`:
   *       i. If `u.state` is 'marching' and `canAct`:
   *          1. If `u` is close to `u.targetX, u.targetY`, sets `u.state` to 'fighting'.
   *          2. Else, calls `this._stepTowardVaried(u, u.targetX, u.targetY)`.
   *       ii. If `u.state` is 'fighting':
   *          1. If not `canAct`, continues.
   *          2. Calls `this._tryDefect(u)`. If `true`:
   *             A. Calls `this._despawnUnitAtIndex(i)`.
   *             B. Adds `u` to `_enemy.units`.
   *             C. Recalculates `_enemy.military` and `this.military`.
   *             D. Continues to next unit.
   *          3. Calls `this._shouldRetreat(u)`. If `true`:
   *             A. Sets `u.state` to 'idle', clears `u.attackTarget`.
   *             B. Continues.
   *          4. Checks for `leaderNearby` and calculates `leaderBonus`.
   *          5. Filters `_enemy.units` and `_enemy.buildings` within range.
   *          6. Calculates `atkPower` based on unit stats, tech level, and leader strength/bonus.
   *          7. If `enemyUnits` are found:
   *             A. Selects first `tgt`.
   *             B. Calculates `dmg`, applies defense reduction to `tgt.hp`.
   *             C. Sets `u.attackTarget`.
   *             D. If `tgt.hp <= 0`, despawns `tgt` from enemy, increments enemy casualties, logs kill message.
   *             E. Calculates `retaliation` damage, applies defense reduction to `u.hp`.
   *          8. Else if `enemyBuildings` are found:
   *             A. Selects first `bld`.
   *             B. Calculates `bldDmg`, applies it to `bld.hp`.
   *             C. Sets `u.attackTarget`, sets `bld._underAttack` timer.
   *             D. If `bld.hp <= 0`, removes `bld` from enemy buildings, logs destroy message.
   *             E. Reduces `u.hp` by a small amount.
   *          9. Else (no enemies in range), sets `u.state` to 'idle', clears `u.attackTarget`.
   *       iii. If `u.hp <= 0` (after fighting or retaliation):
   *          1. Calls `this._despawnUnitAtIndex(i)`.
   *          2. Increments `this.casualties`.
   *          3. Recalculates `this.military`.
   *    n. If `u.type` is `WORKER`:
   *       i. Finds `STOREHOUSE` buildings and calculates `storageCap`.
   *       ii. Finds `nearTree` within range.
   *       iii. If `nearTree` exists and `this.res.wood` is below 80% capacity:
   *          1. If `u` is at `nearTree`'s location: harvests tree, updates `this.res.wood`, potentially plants new tree.
   *          2. Else if `canAct`, calls `this._stepTowardVaried(u, nearTree.x, nearTree.y)` and sets `u.state` to 'working'.
   *          3. Continues.
   *       iv. If `this.res.wood` is low and `canAct` (10% chance), randomly plants a tree.
   *       v. Finds `damaged` buildings (hp < maxHp), sorted by health fraction.
   *       vi. If `damaged` buildings exist:
   *          1. Selects `target`.
   *          2. If `u` is close to `target`: if `canAct`, repairs building using `_getWorkerBuildSpeed`, updates `target.hp`.
   *          3. Else if `canAct`: calls `this._stepTowardVaried(u, target.x, target.y)`.
   *          4. Sets `u.state` to 'working'.
   *       vii. Else (no work):
   *          1. If `canAct` (15% chance), sets `u.targetX, u.targetY` to a random spot around capitol.
   *          2. If `canAct` and `u.targetX` is defined, calls `this._stepTowardVaried(u, u.targetX, u.targetY)`.
   *          3. Sets `u.state` to 'idle'.
   *    o. If `u.type` is `SCOUT`:
   *       i. If not `canAct`, continues.
   *       ii. Checks for `closeEnemy` within range.
   *       iii. If `closeEnemy` found: attacks it, applies damage, sets `u.attackTarget`. If enemy dies, despawns it from enemy, increments enemy casualties, recalculates enemy military. Continues.
   *       iv. Calculates `distToMid` based on `u.x` and `CONFIG.MAP_W`.
   *       v. If `u.state` is 'idle' or `u.patrolDir` is not set: sets `u.patrolDir` based on distance to map center, sets `u.state` to 'patrolling'.
   *       vi. If `u.state` is 'patrolling':
   *          1. Calculates `tx, ty` for movement.
   *          2. If `_world.isWalkable(tx, ty)`, moves `u` and notifies `_world`.
   *          3. Checks for `nearEnemy` within range. If found (5% chance), logs warning.
   *          4. Adjusts `u.patrolDir` if `u` is too close or far from map center.
   *    p. If `u.type` is `NORMAL`:
   *       i. If not `canAct`, continues.
   *       ii. If `u.state` is 'idle' (28% chance), finds a home or first building, sets `u.targetX, u.targetY` to a random spot around it, and sets `u.state` to 'wandering'.
   *       iii. If `u.targetX, u.targetY` are defined, calls `this._stepTowardVaried(u, u.targetX, u.targetY)`.
   *       iv. If `u` is close to target, sets `u.state` to 'idle'.
   * 2. Recalculates `this.military` after the loop.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY constants, CONFIG.SCOUT_MOVE_INTERVAL, CONFIG.UNIT_MOVE_INTERVAL, CONFIG.UNIT_ROAD_DIVISOR, CONFIG.UNIT_HP, CONFIG.UNIT_STATS_BASE, CONFIG.MAP_W, Game.eventLog(), this.units, this.buildings, this._world.weatherMods, this._world.getTile(), this._world.isWalkable(), this._world.hasEnemyWall(), this._world.notifyEntityMoved(), this._world.getEntitiesAt(), this._world.getNearbyTree(), this._world.harvestTree(), this._world.plantTree(), this._enemy.units, this._enemy.buildings, this._enemy._despawnUnitByObject(), this._rollUnitStats(), this._agilityFactor(), this._stepTowardVaried(), this._tryDefect(), this._shouldRetreat(), this._nearbyLeader(), this._getUnitAttackValue(), this._applyDefenseReduction(), this._despawnUnitAtIndex(), this._getWorkerBuildSpeed(), Math.abs(), Math.sqrt(), Math.round(), Math.min(), Math.max(), Math.floor(), Math.random().
   * @modifies unit._moveTimer, unit._pauseTicks, unit._hungerTarget, unit.state, unit.targetX, unit.targetY, unit.attackTarget, unit.hp, unit.tribe, this.res.wood, this.res.food, this.units, this.military, this.casualties, this._enemy.units, this._enemy.military, this._enemy.casualties, this._enemy.buildings, building._underAttack, world (by moving/removing entities, harvesting/planting trees).
   * @triggers Called by `tick()`.
   * @performance O(U * R) where U is the number of units and R is the average range check (small constant for neighbors, or limited range for enemies/buildings). Dominant factor is U.
   */
  _updateUnits() {
    for (let i = this.tribe.units.length - 1; i >= 0; i--) {
      const u = this.tribe.units[i];
      const stats = u.stats || this.tribe._rollUnitStats(u.type);
      u.stats = stats;

      const baseMI = u.type === CONFIG.ENTITY.SCOUT
        ? CONFIG.SCOUT_MOVE_INTERVAL
        : CONFIG.UNIT_MOVE_INTERVAL;
      const weatherMult = this.tribe._world.weatherMods ? this.tribe._world.weatherMods.moveMult : 1;
      const tile = this.tribe._world.getTile(u.x, u.y);
      /**
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
       */
      const roadDiv = (tile && tile.road) ? CONFIG.UNIT_ROAD_DIVISOR : 1;
      const agilityFactor = this.tribe._agilityFactor(stats);
      const moveInterval = Math.max(1, Math.round(baseMI * weatherMult * agilityFactor / roadDiv));

      u._moveTimer = (u._moveTimer || 0) + 1;
      const canAct = u._moveTimer >= moveInterval;
      if (canAct) u._moveTimer = 0;

      if (u._pauseTicks && u._pauseTicks > 0) {
        u._pauseTicks--;
        continue;
      }
      if (u.state !== 'fighting' && canAct) {
        const pauseChance = u.type === CONFIG.ENTITY.SCOUT ? 0.04 : (u.type === CONFIG.ENTITY.WORKER ? 0.12 : 0.08);
        if (Math.random() < pauseChance) {
          u._pauseTicks = 1 + Math.floor(Math.random() * (u.type === CONFIG.ENTITY.SCOUT ? 2 : 4));
          continue;
        }
      }

      // ── Hunger override ──
      if (u._hungerTarget && u.state !== 'fighting') {
        if (canAct) this._stepTowardVaried(u, u._hungerTarget.x, u._hungerTarget.y);
        if (Math.abs(u.x - u._hungerTarget.x) + Math.abs(u.y - u._hungerTarget.y) <= 1) {
          u._hungerTarget = null;
        }
        continue;
      }

      // ── WARRIOR / LEADER ──
      if (u.type === CONFIG.ENTITY.WARRIOR || u.type === CONFIG.ENTITY.LEADER) {
        if (u.state === 'marching' && canAct) {
          const dx = u.targetX - u.x;
          const dy = u.targetY - u.y;
          if (Math.sqrt(dx*dx + dy*dy) < 1.5) {
            u.state = 'fighting';
          } else {
            this._stepTowardVaried(u, u.targetX, u.targetY);
          }
        }

        if (u.state === 'fighting') {
          if (!canAct) continue;

          if (this._tryDefect(u)) {
            this.tribe._despawnUnitAtIndex(i);
            this.tribe._enemy.units.push(u);
            this.tribe._enemy.military = this.tribe._enemy.units.filter(mu =>
              mu.type === CONFIG.ENTITY.WARRIOR || mu.type === CONFIG.ENTITY.LEADER
            ).length;
            this.tribe.military = this.tribe.units.filter(mu =>
              mu.type === CONFIG.ENTITY.WARRIOR || mu.type === CONFIG.ENTITY.LEADER
            ).length;
            continue;
          }

          if (this._shouldRetreat(u)) {
            u.state = 'idle';
            u.attackTarget = null;
            continue;
          }

          const leaderNearby = this._nearbyLeader(u);
          const leaderBonus = leaderNearby ? 1.25 : 1.0;

          const range = u.type === CONFIG.ENTITY.LEADER ? 3 : 2;
          const enemyUnits = this.tribe._enemy.units.filter(eu =>
            Math.abs(eu.x - u.x) <= range && Math.abs(eu.y - u.y) <= range
          );
          const enemyBuildings = this.tribe._enemy.buildings.filter(eb =>
            Math.abs(eb.x - u.x) <= range && Math.abs(eb.y - u.y) <= range
          );

          const atkPower = this.tribe._getUnitAttackValue(u) * (1 + this.tribe.techLevel * 0.08) * this.tribe.leader.strength * leaderBonus;

          if (enemyUnits.length) {
            const tgt = enemyUnits[0];
            const dmg = Math.max(0.5, atkPower - this.tribe._enemy.leader.strength * 0.3 + Math.random());
            tgt.hp -= this.tribe._applyDefenseReduction(tgt, dmg);
            u.attackTarget = { x: tgt.x, y: tgt.y, id: tgt.id, kind: 'unit' };
            if (tgt.hp <= 0) {
              this.tribe._enemy._despawnUnitByObject(tgt);
              this.tribe._enemy.military = this.tribe._enemy.units.length;
              this.tribe._enemy.casualties++;
              if (Math.random() < 0.25) {
                const kills = [
                  `A ${this.tribe.name} warrior cuts down an enemy ${tgt.type}!`,
                  `${this.tribe.name} warriors overwhelm an enemy fighter. Another falls.`,
                  `${this.tribe._enemy.name} loses a ${tgt.type} in the fray.`,
                  `Blood stains the earth as ${this.tribe.name} claims a kill.`,
                  `An enemy ${tgt.type} collapses — ${this.tribe.name} advances.`,
                ];
                Game.eventLog(kills[Math.floor(Math.random() * kills.length)], 'danger');
              }
            }
            const retaliation = Math.max(
              0.15,
              this.tribe._getUnitAttackValue(tgt) * this.tribe._enemy.leader.strength * 0.25
            );
            u.hp -= this.tribe._applyDefenseReduction(u, retaliation);
          } else if (enemyBuildings.length) {
            const bld = enemyBuildings[0];
            const bldDmg = atkPower * 0.12;
            bld.hp -= Math.max(0.1, bldDmg);
            u.attackTarget = { x: bld.x, y: bld.y, id: bld.id, kind: 'building' };
            bld._underAttack = 4;
            if (bld.hp <= 0) {
              this.tribe._enemy.buildings.splice(this.tribe._enemy.buildings.indexOf(bld), 1);
              const destroyMsgs = [
                `${this.tribe.name} DESTROYS a ${bld.type.replace('_',' ')} of ${this.tribe._enemy.name}!`,
                `${this.tribe._enemy.name}'s ${bld.type.replace('_',' ')} burns to the ground!`,
                `Fire and ruin — ${this.tribe.name} razes an enemy ${bld.type.replace('_',' ')}.`,
                `${this.tribe._enemy.name} loses their ${bld.type.replace('_',' ')}. The walls crumble.`,
              ];
              Game.eventLog(destroyMsgs[Math.floor(Math.random() * destroyMsgs.length)], 'danger');
            }
            u.hp -= 0.03;
          } else {
            u.state = 'idle';
            u.attackTarget = null;
          }

          if (u.hp <= 0) {
            this.tribe._despawnUnitAtIndex(i);
            this.tribe.casualties++;
            this.tribe.military = this.tribe.units.length;
          }
        }
      }

      // ── WORKER ──
      if (u.type === CONFIG.ENTITY.WORKER) {
        const storehouses = this.tribe.buildings.filter(b => b.type === CONFIG.ENTITY.STOREHOUSE);
        const storageCap = CONFIG.STORAGE_BASE_CAP
          + storehouses.reduce((s, b) => s + CONFIG.STORAGE_PER_STOREHOUSE * (b.level || 1), 0);

        // Hunt animals when food carry is low
        if (u.carriedFood !== undefined && u.carriedFood < (u.carriedFoodMax || 1) * 0.5
            && typeof Game !== 'undefined' && Game.wildlife) {
          const prey = Game.wildlife.getHuntable(u.x, u.y, 2);
          if (prey) {
            const str = u.stats ? u.stats.strength : 5;
            const food = Game.wildlife.hunt(prey, 1 + str * 0.3);
            if (food > 0) {
              u.carriedFood = Math.min(u.carriedFoodMax || 99, u.carriedFood + food);
              u.state = 'working';
              continue;
            }
          }
        }

        const nearTree = this.tribe._world.getNearbyTree(u.x, u.y, 7);
        if (nearTree && this.tribe.res.wood < storageCap * 0.8) {
          u.resourceTarget = null;
          if (u.x === nearTree.x && u.y === nearTree.y) {
            const wood = this.tribe._world.harvestTree(nearTree.x, nearTree.y);
            this.tribe.res.wood = Math.min(storageCap, this.tribe.res.wood + wood);
            if (Math.random() < 0.30) this.tribe._world.plantTree(nearTree.x, nearTree.y);
          } else if (canAct) {
            this._stepTowardVaried(u, nearTree.x, nearTree.y);
            u.state = 'working';
          }
          continue;
        }

        if (this.tribe.res.wood < 20 && canAct && Math.random() < 0.10) {
          const px = u.x + Math.floor(Math.random() * 5) - 2;
          const py = u.y + Math.floor(Math.random() * 5) - 2;
          this.tribe._world.plantTree(px, py);
        }

        const damaged = this.tribe.buildings
          .filter(b => b.hp < b.maxHp)
          .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));

        if (damaged.length) {
          u.resourceTarget = null;
          const target = damaged[0];
          const dist = Math.sqrt((target.x - u.x) ** 2 + (target.y - u.y) ** 2);
          if (dist < 1.5) {
            if (canAct) {
              const buildSpeed = this.tribe.bld._getWorkerBuildSpeed(u);
              target.hp = Math.min(target.maxHp, target.hp + buildSpeed);
            }
          } else if (canAct) {
            this._stepTowardVaried(u, target.x, target.y);
          }
          u.state = 'working';
        } else {
          // Seek/mine Stone and Metal when stockpiles are low
          if (u.resourceTarget) {
            const tile = this.tribe._world.getTile(u.resourceTarget.x, u.resourceTarget.y);
            if (tile && tile.resourceNode && tile.resourceNode.amount >= 1) {
              const dist = Math.sqrt((tile.x - u.x) ** 2 + (tile.y - u.y) ** 2);
              if (dist < 1.5) {
                u.state = 'working';
              } else if (canAct) {
                this._stepTowardVaried(u, tile.x, tile.y);
                u.state = 'working';
              }
              continue;
            } else {
              u.resourceTarget = null;
            }
          }

          let neededRes = null;
          if (this.tribe.res.metal < storageCap * 0.8 && this.tribe.res.stone < storageCap * 0.8) {
            neededRes = this.tribe.res.metal <= this.tribe.res.stone ? 'metal' : 'stone';
          } else if (this.tribe.res.metal < storageCap * 0.8) {
            neededRes = 'metal';
          } else if (this.tribe.res.stone < storageCap * 0.8) {
            neededRes = 'stone';
          }

          if (neededRes) {
            const range = CONFIG.WORKER_SEARCH_RANGE || 35;
            const nearRes = this.tribe._world.getNearbyResource(u.x, u.y, neededRes, range);
            if (nearRes) {
              u.resourceTarget = { x: nearRes.x, y: nearRes.y, type: neededRes };
              if (canAct) {
                this._stepTowardVaried(u, nearRes.x, nearRes.y);
                u.state = 'working';
              }
              continue;
            }
          }

          if (canAct && Math.random() < 0.15) {
            const outposts = this.tribe.buildings.filter(b =>
              b.type === CONFIG.ENTITY.CAPITOL ||
              b.type === CONFIG.ENTITY.STOREHOUSE ||
              b.type === CONFIG.ENTITY.FORT
            );
            let nearestOutpost = null;
            let minDist = Infinity;
            for (const o of outposts) {
              /**
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
               */
              const d = (o.x - u.x) ** 2 + (o.y - u.y) ** 2;
              if (d < minDist) {
                minDist = d;
                nearestOutpost = o;
              }
            }
            const anchor = nearestOutpost || this.tribe.buildings.find(b => b.type === CONFIG.ENTITY.CAPITOL);
            if (anchor) {
              u.targetX = anchor.x + Math.floor(Math.random() * 5) - 2;
              u.targetY = anchor.y + Math.floor(Math.random() * 5) - 2;
            }
          }
          if (canAct && u.targetX !== undefined) this._stepTowardVaried(u, u.targetX, u.targetY);
          u.state = 'idle';
        }
      }

      // ── SCOUT ──
      if (u.type === CONFIG.ENTITY.SCOUT) {
        if (!canAct) continue;

        const closeEnemy = this.tribe._enemy.units.find(eu =>
          Math.abs(eu.x - u.x) <= 1 && Math.abs(eu.y - u.y) <= 1
        );
        if (closeEnemy) {
          const scoutAtk = this.tribe._getUnitAttackValue(u) * (1 + this.tribe.techLevel * 0.04);
          closeEnemy.hp -= this.tribe._applyDefenseReduction(closeEnemy, Math.max(0.25, scoutAtk * 0.45));
          u.attackTarget = { x: closeEnemy.x, y: closeEnemy.y, id: closeEnemy.id, kind: 'unit' };
          if (closeEnemy.hp <= 0) {
            this.tribe._enemy._despawnUnitByObject(closeEnemy);
            this.tribe._enemy.casualties++;
            this.tribe._enemy.military = this.tribe._enemy.units.filter(mu =>
              mu.type === CONFIG.ENTITY.WARRIOR || mu.type === CONFIG.ENTITY.LEADER
            ).length;
          }
          continue;
        }

        // Hunt animals when food carry is low (scouts range far from base)
        if (u.carriedFood !== undefined && u.carriedFood < (u.carriedFoodMax || 1) * 0.4
            && typeof Game !== 'undefined' && Game.wildlife) {
          const prey = Game.wildlife.getHuntable(u.x, u.y, 2);
          if (prey) {
            const str = u.stats ? u.stats.strength : 5;
            const food = Game.wildlife.hunt(prey, 1 + str * 0.2);
            if (food > 0) {
              u.carriedFood = Math.min(u.carriedFoodMax || 99, u.carriedFood + food);
              continue;
            }
          }
        }

        const midX = CONFIG.MAP_W / 2;
        const distToMid = Math.abs(u.x - midX);
        const ox = this.tribe.id === 'a' ? 1 : -1;

        if (u.state === 'idle' || !u.patrolDir) {
          u.patrolDir = distToMid < 6 ? -ox : ox;
          u.state = 'patrolling';
        }

        if (u.state === 'patrolling') {
          const tx = u.x + u.patrolDir;
          const ty = u.y + Math.floor(Math.random() * 3) - 1;
          if (this.tribe._world.isWalkable(tx, ty)) { u.x = tx; u.y = ty; this.tribe._world.notifyEntityMoved(u); }

          const nearEnemy = this.tribe._enemy.units.some(eu =>
            Math.abs(eu.x - u.x) <= 5 && Math.abs(eu.y - u.y) <= 5
          );
          if (nearEnemy && Math.random() < 0.05) {
            Game.eventLog(`A ${this.tribe.name} scout spots enemy movement near the border.`, 'warn');
          }

          if (distToMid < 3) u.patrolDir = -ox;
          if (distToMid > 14) u.patrolDir = ox;
        }
      }

      // ── NORMAL ──
      if (u.type === CONFIG.ENTITY.NORMAL) {
        if (!canAct) continue;
        if (u.state === 'idle' && Math.random() < 0.28) {
          const home = this.tribe.buildings.find(b => b.type === CONFIG.ENTITY.HOME) || this.tribe.buildings[0];
          if (home) {
            u.targetX = home.x + Math.floor(Math.random() * 5) - 2;
            u.targetY = home.y + Math.floor(Math.random() * 5) - 2;
            u.state = 'wandering';
          }
        }
        if (u.targetX !== undefined && u.targetY !== undefined) {
          this._stepTowardVaried(u, u.targetX, u.targetY);
          if (Math.abs(u.x - u.targetX) + Math.abs(u.y - u.targetY) <= 1) u.state = 'idle';
        }
      }
    }

    this.tribe.military = this.tribe.units.filter(u => u.type === CONFIG.ENTITY.WARRIOR || u.type === CONFIG.ENTITY.LEADER).length;
  }

  /**
   * Moves a unit one step closer to a target coordinate, avoiding obstacles and enemy walls.
   *
   * @description This private helper function calculates the best adjacent walkable tile for a unit to move towards a specific target (`tx`, `ty`). It evaluates all neighboring tiles, filtering out non-walkable terrain and tiles containing enemy walls, then selects the neighbor that minimizes the Euclidean distance to the target. The unit's position is updated, and the world is notified of the movement.
   *
   * @workflow
   * 1. If `u.x` is `tx` and `u.y` is `ty`, returns immediately (already at target).
   * 2. Calls `this._world.getNeighbors(u.x, u.y)` to get adjacent tiles.
   * 3. Initializes `best` to `null` and `bestDist` to `Infinity`.
   * 4. For each `n` in `neighbors`:
   *    a. If `this._world.isWalkable(n.x, n.y)` is `false`, continues.
   *    b. If `this._world.hasEnemyWall(n.x, n.y, this.id)` is `true`, continues.
   *    c. Calculates squared Euclidean distance `d` from `n` to `tx, ty`.
   *    d. If `d` is less than `bestDist`: updates `bestDist` to `d` and `best` to `n`.
   * 5. If `best` is found:
   *    a. Updates `u.x` to `best.x` and `u.y` to `best.y`.
   *    b. Calls `this._world.notifyEntityMoved(u)`.
   *
   * @param {Object} u - The unit object to move. Must have `x` and `y` properties.
   * @param {number} tx - The target X coordinate.
   * @param {number} ty - The target Y coordinate.
   * @returns {void}
   *
   * @dependencies this._world.getNeighbors(), this._world.isWalkable(), this._world.hasEnemyWall(), this._world.notifyEntityMoved().
   * @modifies u.x, u.y, world (via `notifyEntityMoved`).
   * @triggers Called by internal unit movement logic (e.g., in early versions or specific scenarios).
   * @performance O(1) as `getNeighbors` returns a small constant number of neighbors (e.g., 4 or 8).
   */
  _stepToward(u, tx, ty) {
    if (u.x === tx && u.y === ty) return;
    const neighbors = this.tribe._world.getNeighbors(u.x, u.y);
    let best = null, bestDist = Infinity;
    for (const n of neighbors) {
      if (!this.tribe._world.isWalkable(n.x, n.y)) continue;
      if (this.tribe._world.hasEnemyWall(n.x, n.y, this.tribe.id)) continue;
      /**
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
       */
      const d = (tx - n.x) ** 2 + (ty - n.y) ** 2;
      if (d < bestDist) { bestDist = d; best = n; }
    }
    if (best) {
      u.x = best.x;
      u.y = best.y;
      this.tribe._world.notifyEntityMoved(u);
    }
  }

  /**
   * Moves a unit one step closer to a target coordinate, with a slight random variation to prevent predictable paths.
   *
   * @description This private helper function moves a unit towards a target `tx, ty` similar to `_stepToward`, but introduces randomness. It evaluates all valid neighboring tiles, filters obstacles and enemy walls, then sorts them by distance. It usually picks the closest, but has a chance to pick a slightly less optimal but still close tile, leading to more natural and less "grid-like" movement patterns.
   *
   * @workflow
   * 1. If `u.x` is `tx` and `u.y` is `ty`, returns immediately.
   * 2. Calls `this._world.getNeighbors(u.x, u.y)` to get adjacent tiles.
   * 3. Initializes an `options` array.
   * 4. For each `n` in `neighbors`:
   *    a. If `this._world.isWalkable(n.x, n.y)` is `false`, continues.
   *    b. If `this._world.hasEnemyWall(n.x, n.y, this.id)` is `true`, continues.
   *    c. Calculates squared Euclidean distance `d` from `n` to `tx, ty`.
   *    d. Pushes `{ n, d }` to `options`.
   * 5. If `options` is empty, returns immediately (no valid moves).
   * 6. Sorts `options` by distance `d` in ascending order.
   * 7. Sets `pick` to the first (closest) option.
   * 8. If `options.length` is greater than 1 and a random check passes (0.22 chance):
   *    a. Filters `options` to `alt` containing options whose distance is within 2.0 of the closest.
   *    b. Selects a random `pick` from `alt`.
   * 9. Updates `u.x` to `pick.n.x` and `u.y` to `pick.n.y`.
   * 10. Calls `this._world.notifyEntityMoved(u)`.
   *
   * @param {Object} u - The unit object to move. Must have `x` and `y` properties.
   * @param {number} tx - The target X coordinate.
   * @param {number} ty - The target Y coordinate.
   * @returns {void}
   *
   * @dependencies this._world.getNeighbors(), this._world.isWalkable(), this._world.hasEnemyWall(), this._world.notifyEntityMoved(), Math.random().
   * @modifies u.x, u.y, world (via `notifyEntityMoved`).
   * @triggers Called by `_updateUnits()` for most unit movement.
   * @performance O(1) as `getNeighbors` returns a small constant number of neighbors, and sorting/filtering is on a very small array.
   */
  _stepTowardVaried(u, tx, ty) {
    if (u.x === tx && u.y === ty) return;
    const neighbors = this.tribe._world.getNeighbors(u.x, u.y);
    const options = [];
    for (const n of neighbors) {
      if (!this.tribe._world.isWalkable(n.x, n.y)) continue;
      if (this.tribe._world.hasEnemyWall(n.x, n.y, this.tribe.id)) continue;
      /**
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
       */
      const d = (tx - n.x) ** 2 + (ty - n.y) ** 2;
      options.push({ n, d });
    }
    if (!options.length) return;

    options.sort((a, b) => a.d - b.d);
    let pick = options[0];

    if (options.length > 1 && Math.random() < 0.22) {
      const alt = options.filter(o => o.d <= options[0].d + 2.0);
      pick = alt[Math.floor(Math.random() * alt.length)];
    }

    u.x = pick.n.x;
    u.y = pick.n.y;
    this.tribe._world.notifyEntityMoved(u);
  }

  /**
   * Checks if a leader unit from the same tribe is within a short range of a given unit.
   *
   * @description This private helper function determines if any of the tribe's leader units are in close proximity (within a 3x3 square radius) to a specified unit. This check is primarily used to apply combat bonuses to units operating near their leader, simulating the effect of leadership on battlefield performance.
   *
   * @workflow
   * 1. Iterates through `this.units`.
   * 2. For each `other` unit:
   *    a. If `other.type` is `CONFIG.ENTITY.LEADER` AND `Math.abs(other.x - u.x)` is less than or equal to 3 AND `Math.abs(other.y - u.y)` is less than or equal to 3, returns `true`.
   * 3. If no such leader is found after checking all units, returns `false`.
   *
   * @param {Object} u - The unit object to check for nearby leaders.
   * @returns {boolean} True if a leader is within 3 tiles (inclusive) horizontally and vertically, false otherwise.
   *
   * @dependencies CONFIG.ENTITY.LEADER, this.units, Math.abs().
   * @modifies None.
   * @triggers Called by `_updateUnits()` when processing warrior/leader combat logic.
   * @performance O(U) where U is the number of units in the tribe.
   */
  _nearbyLeader(u) {
    return this.tribe.units.some(other =>
      other.type === CONFIG.ENTITY.LEADER &&
      Math.abs(other.x - u.x) <= 3 && Math.abs(other.y - u.y) <= 3
    );
  }

  /**
   * Determines if a unit should attempt to retreat from combat.
   *
   * @description This private helper function assesses whether a unit, particularly in combat, decides to retreat. It primarily considers the unit's current health fraction and its `tenacity` and `loyalty` stats. Units with low health or low morale are more likely to retreat, while tenacious and loyal units will hold their ground longer.
   *
   * @workflow
   * 1. Calculates `hpFrac` (current HP / max HP).
   * 2. If `hpFrac` is greater than 0.55, returns `false` (not low enough health).
   * 3. Retrieves `tenacity` and `loyalty` from `unit.stats` or defaults to 5.
   * 4. Calculates `holdChance` based on `tenacity`, `loyalty`, and `hpFrac`, clamped between 0.08 and 0.96.
   * 5. Returns `true` if `Math.random()` is greater than `holdChance` (meaning the unit fails to hold), otherwise `false`.
   *
   * @param {Object} unit - The unit object to evaluate for retreat. Must have `hp`, `maxHp`, and `stats` properties.
   * @returns {boolean} True if the unit should retreat, false otherwise.
   *
   * @dependencies Math.max(), Math.min(), Math.random().
   * @modifies None.
   * @triggers Called by `_updateUnits()` for warrior/leader combat logic.
   * @performance O(1).
   */
  _shouldRetreat(unit) {
    const hpFrac = unit.hp / Math.max(1, unit.maxHp);
    if (hpFrac > 0.55) return false;

    const tenacity = unit.stats ? unit.stats.tenacity : 5;
    const loyalty = unit.stats ? unit.stats.loyalty : 5;
    const holdChance = Math.max(0.08, Math.min(0.96, (tenacity * 0.07) + (loyalty * 0.03) + hpFrac * 0.18));
    return Math.random() > holdChance;
  }

  /**
   * Determines if a unit defects to the enemy tribe during combat.
   *
   * @description This private helper function simulates the possibility of a non-leader unit abandoning its tribe and joining the enemy. It's influenced by the unit's `loyalty` stat, its current health, and the tribe's overall morale. Units with lower loyalty, low health, or poor tribal morale are more prone to defection. If a unit defects, its tribe is switched, and a game event is logged.
   *
   * @workflow
   * 1. If `unit.type` is `CONFIG.ENTITY.LEADER`, returns `false` (leaders cannot defect).
   * 2. Retrieves `loyalty` from `unit.stats` or defaults to 5.
   * 3. If `loyalty` is 6.0 or higher, returns `false` (too loyal).
   * 4. Calculates `hpFrac` (current HP / max HP).
   * 5. Calculates `moralePenalty` based on `this.morale`.
   * 6. Calculates `baseChance` for defection, incorporating `loyalty`, `moralePenalty`, and `hpFrac`.
   * 7. Clamps `baseChance` to `chance` between 0 and 0.16.
   * 8. If `Math.random()` is greater than or equal to `chance`, returns `false`.
   * 9. Sets `unit.tribe` to `this._enemy.id`.
   * 10. Sets `unit.state` to 'idle' and clears `unit.targetX, unit.targetY`.
   * 11. Logs the defection event using `Game.eventLog()`.
   * 12. Returns `true`.
   *
   * @param {Object} unit - The unit object to evaluate for defection. Must have `type`, `hp`, `maxHp`, and `stats` properties.
   * @returns {boolean} True if the unit defects, false otherwise.
   *
   * @dependencies CONFIG.ENTITY.LEADER, Game.eventLog(), this._enemy.id, this.morale, Math.max(), Math.min(), Math.random().
   * @modifies unit.tribe, unit.state, unit.targetX, unit.targetY.
   * @triggers Called by `_updateUnits()` for warrior/leader combat logic.
   * @performance O(1).
   */
  _tryDefect(unit) {
    if (unit.type === CONFIG.ENTITY.LEADER) return false;

    const loyalty = unit.stats ? unit.stats.loyalty : 5;
    if (loyalty >= 6.0) return false;

    const hpFrac = unit.hp / Math.max(1, unit.maxHp);
    const moralePenalty = Math.max(0, 0.7 - this.tribe.morale);
    /**
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
     */
    const baseChance = (6.2 - loyalty) * 0.015 + moralePenalty * 0.04 + (hpFrac < 0.35 ? 0.015 : 0);
    const chance = Math.max(0, Math.min(0.16, baseChance));
    if (Math.random() >= chance) return false;

    unit.tribe = this.tribe._enemy.id;
    unit.state = 'idle';
    unit.targetX = unit.x;
    unit.targetY = unit.y;
    Game.eventLog(`${this.tribe.name} loses a ${unit.type} to defection!`, 'warn');
    return true;
  }

}
