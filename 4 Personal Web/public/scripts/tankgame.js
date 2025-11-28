(() => {
  /* Helper functions and consts*/
  function dist(a, b) { 
    let dx = a.x - b.x, dy = a.y - b.y; 
    return Math.hypot(dx, dy); 
  }

  const Statuses = {
    ALIVE: Symbol("ALIVE"),
    DYING: Symbol("DYING"),
    DEAD: Symbol("DEAD")
  };
  Object.freeze(Statuses);

  /* Prepare entities: tank, bullet */
  class Tank {
    constructor(x, y, isPlayer, color = 'lime') {
      this.x = x;
      this.y = y;
      this.color = color;
      this.WIDTH = 40;
      this.HEIGHT = 40;
      this.DISPLAY_CALIBRATION = 0; // To make the collision with canvas look right
      this.TURRET_WIDTH = 20;
      this.TURRET_HEIGHT = 20;
      this.TURRET_COLOR = '#292828ff';
      this.GUN_WIDTH = 5;
      this.GUN_HEIGHT = 30;
      this.GUN_COLOR = '#4c4c4cff';

      this.direction = 0; // 0: up, 1: right, 2: down, 3: left
      this.TANK_SPEED = 120;
      this.isPlayer = isPlayer;
      this.dyingAnimCounter = 0.4; 
      this.DYING_EXPLOSION_RADIUS = Math.max(this.WIDTH / 2, this.HEIGHT / 2) - 5;
      this.DYING_EXPLOSION_R_INCREMENT = 0.2;
      this.reload = 0; // Reload bullets counter
      this.reloadTime = 0.35;
      this.ifBulletCoolDown = false;
      this.status = Statuses.ALIVE;
    }

    //this.collisionDetect(this.direction, enemies, this, panelWidth, panelHeight, dt);
    collisionDetect(direction, enemies, player, panelWidth, panelHeight, dt) {
      var newX;
      var newY;
      var allOtherTanks = [];
      if (player.status === Statuses.ALIVE && this.isPlayer === false) {
        allOtherTanks.push(player);
      }
      enemies.forEach(e => {
        if (e.status === Statuses.ALIVE && e !== this) {
          allOtherTanks.push(e);
        }
      });

      switch (direction) {
        case 0 :
          newX = this.x;
          newY = this.y - this.TANK_SPEED * dt;

          // Check collision with the canvas
          if (newY < 0) {
            return false;
          }

          // Check collision with other tanks
          for (const t of allOtherTanks) {
            if ((newX >= t.x && newX <= t.x + t.WIDTH 
                && newY >= t.y && newY <= t.y + t.HEIGHT)
                || (newX + this.WIDTH >= t.x && newX + this.WIDTH <= t.x + t.WIDTH 
                && newY >= t.y && newY <= t.y + t.HEIGHT)) {
              return false;
            }
          }
          
          break;
          
        case 2 :
          newX = this.x;
          newY = this.y + this.TANK_SPEED * dt;

          if (newY + this.HEIGHT > panelHeight) {
            return false;
          }

          for (const t of allOtherTanks) {
            if ((newX + this.WIDTH >= t.x && newX + this.WIDTH <= t.x + t.WIDTH
                && newY + this.HEIGHT >= t.y && newY + this.HEIGHT <= t.y + t.HEIGHT)
                || (newX >= t.x && newX <= t.x + t.WIDTH
                && newY + this.HEIGHT >= t.y && newY + this.HEIGHT <= t.y + t.HEIGHT)) {
              return false;
            }
          }

          break;

        case 1 :
          newX = this.x + this.TANK_SPEED * dt;
          newY = this.y;

          if (newX + this.WIDTH + this.DISPLAY_CALIBRATION > panelWidth) {
            return false;
          }

          for (const t of allOtherTanks) {
            if ((newX + this.WIDTH >= t.x && newX + this.WIDTH <= t.x + t.WIDTH
                && newY >= t.y && newY <= t.y + t.HEIGHT)
                ||(newX + this.WIDTH >= t.x && newX + this.WIDTH <= t.x + t.WIDTH
                && newY + this.HEIGHT >= t.y && newY + this.HEIGHT <= t.y + t.HEIGHT)) {
              return false;
            }
          }

          break;

        case 3 :
          newX = this.x - this.TANK_SPEED * dt;
          newY = this.y;

          if (newX < 0) {
            return false;
          }

          for (const t of allOtherTanks) {
            if ((newX >= t.x && newX <= t.x + t.WIDTH
              && newY >= t.y && newY <= t.y + t.HEIGHT)
              ||(newX >= t.x && newX <= t.x + t.WIDTH
              && newY + this.HEIGHT >= t.y && newY + this.HEIGHT <= t.y + t.HEIGHT)) {
              return false;
            }
          }

          break;
      }
      return true;
    }

    isShot() {
      if (this.status === Statuses.ALIVE) {
        this.status = Statuses.DYING;
      }
    }

    draw(ctx) {

      if (this.status === Statuses.DEAD) return;
      if (this.status === Statuses.DYING) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.DYING_EXPLOSION_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();

      } else if (this.status === Statuses.ALIVE) {
        ctx.save();
      
        ctx.translate(this.x, this.y);
        ctx.fillStyle = this.color;
      
        switch (this.direction) {
          case 0:
            // body
            ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

            // turret & gun
            ctx.fillStyle = this.TURRET_COLOR;
            ctx.fillRect((this.WIDTH - this.TURRET_WIDTH) / 2, (this.HEIGHT - this.TURRET_HEIGHT) / 2, 
            this.TURRET_WIDTH, this.TURRET_HEIGHT);

            ctx.fillStyle = this.GUN_COLOR;
            ctx.fillRect((this.WIDTH - this.GUN_WIDTH) / 2, this.HEIGHT / 2 - this.GUN_HEIGHT, this.GUN_WIDTH, this.GUN_HEIGHT);
            break;

          case 1:
            ctx.fillRect(0, 0, this.HEIGHT, this.WIDTH);

            ctx.fillStyle = this.TURRET_COLOR;
            ctx.fillRect((this.HEIGHT - this.TURRET_HEIGHT) / 2, (this.WIDTH - this.TURRET_WIDTH) / 2,
            this.TURRET_HEIGHT, this.TURRET_WIDTH);

            ctx.fillStyle = this.GUN_COLOR;
            ctx.fillRect(this.HEIGHT / 2, (this.WIDTH - this.GUN_WIDTH) / 2, this.GUN_HEIGHT, this.GUN_WIDTH);
            break;

          case 2:
            ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

            ctx.fillStyle = this.TURRET_COLOR;
            ctx.fillRect((this.WIDTH - this.TURRET_WIDTH) / 2, (this.HEIGHT - this.TURRET_HEIGHT) / 2, 
            this.TURRET_WIDTH, this.TURRET_HEIGHT);

            ctx.fillStyle = this.GUN_COLOR;
            ctx.fillRect((this.WIDTH - this.GUN_WIDTH) / 2, this.HEIGHT / 2, this.GUN_WIDTH, this.GUN_HEIGHT);
            break;

          case 3:
            ctx.fillRect(0, 0, this.HEIGHT, this.WIDTH);

            ctx.fillStyle = this.TURRET_COLOR;
            ctx.fillRect((this.HEIGHT - this.TURRET_HEIGHT) / 2, (this.WIDTH - this.TURRET_WIDTH) / 2,
            this.TURRET_HEIGHT, this.TURRET_WIDTH);

            ctx.fillStyle = this.GUN_COLOR;
            ctx.fillRect(this.HEIGHT / 2 - this.GUN_HEIGHT, (this.WIDTH - this.GUN_WIDTH) / 2, this.GUN_HEIGHT, this.GUN_WIDTH);
            break;
        }

        ctx.restore();   
      }
    }

    shoot(dt, bullets) {
      var newBullet;
      switch(this.direction) {
        case 0: 
          newBullet = new Bullet(this.x + this.WIDTH / 2, this.y + this.HEIGHT / 2 - this.GUN_HEIGHT, 
            this.direction, this.isPlayer? 'p' : 'e');
          break;
        case 1:
          newBullet = new Bullet(this.x + this.WIDTH / 2 + this.GUN_HEIGHT, this.y + this.HEIGHT / 2, 
            this.direction, this.isPlayer? 'p' : 'e');
          break;
        case 2:
          newBullet = new Bullet(this.x + this.WIDTH / 2, this.y + this.HEIGHT / 2 + this.GUN_HEIGHT,
            this.direction, this.isPlayer? 'p' : 'e');
          break;
        case 3:
          newBullet = new Bullet(this.x + this.WIDTH / 2 - this.GUN_HEIGHT, this.y + this.HEIGHT / 2,
            this.direction, this.isPlayer? 'p' : 'e');
          break;
      }
      
      bullets.push(newBullet);
    }
  }

  class Bullet {
    constructor (x, y, direction, owner) {
      this.x = x;
      this.y = y;
      this.direction = direction;
      this.owner = owner; // 'p' or 'e'
      this.BULLET_SPEED = 320; // bullet speed
      this.RADIUS = 3;
      const BULLET_LIFE = 2.5; // seconds
      this.life = BULLET_LIFE;
    }

    update(dt) { 
      switch (this.direction) {
        case 0:
          this.y -= this.BULLET_SPEED * dt;
          break;
        case 1:
          this.x += this.BULLET_SPEED * dt;
          break;
        case 2:
          this.y += this.BULLET_SPEED * dt;
          break;
        case 3:
          this.x -= this.BULLET_SPEED * dt;
          break;
      }
      this.life -= dt; 
    }

    draw(ctx){
      ctx.beginPath();
      ctx.fillStyle = (this.owner === 'p') ? '#ffd' : '#f88';
      ctx.arc(this.x, this.y, this.RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  class Player extends Tank {
    constructor(x, y) { //(x, y, isPlayer, color = 'lime')
      super(x, y, true);
      this.controls = {
        up: false,
        down: false,
        left: false,
        right: false,
        shoot: false
      };
    }

    update(dt, bullets, enemies, panelWidth, panelHeight) {

      if (this.status === Statuses.DEAD) {
        return;
      } else if (this.status === Statuses.DYING) {
        if (this.dyingAnimCounter > 0) {
          this.dyingAnimCounter -= dt;
          this.DYING_EXPLOSION_RADIUS += this.DYING_EXPLOSION_R_INCREMENT;
        } else {
          this.status = Statuses.DEAD;
        }
      } else if (this.status === Statuses.ALIVE) {
        let vx = 0;
        let vy = 0;

        if(this.controls.up) { 
          vy = -1;
          this.direction = 0;
        } else if(this.controls.down) {
          vy = 1;
          this.direction = 2;
        } else if(this.controls.left) {
          vx = -1;
          this.direction = 3;
        } else if(this.controls.right) {
          vx = 1;
          this.direction = 1;
        }

        // Deal with shoot and reload logic
        if (this.ifBulletCoolDown === true) {
          this.reload += dt;
        }

        if (this.controls.shoot) {
          if (this.reload === 0) {
            this.ifBulletCoolDown = true;
            this.shoot(dt, bullets);
          } else if (this.reload >= this.reloadTime) {
            this.reload = 0;
            this.ifBulletCoolDown = false;
          }
        }

        // Do a collision detect and then move
        const ifNotCollided = this.collisionDetect(this.direction, enemies, this, panelWidth, 
          panelHeight, dt);

    
        if (ifNotCollided && (vx !== 0 || vy !== 0)) {
          this.y += vy * this.TANK_SPEED * dt;
          this.x += vx * this.TANK_SPEED * dt;
        }
      }
    }

    bulletCoolDownStart(dt) {
      this.reload += dt;
    }
  }

  class Enemy extends Tank {
    constructor(x,y) {
      super(x, y, false, '#f96');
      this.reloadTime = 0.9;
      this.direction = 2;
    
    }

    randomMove(enemies, player, panelWidth, panelHeight, dt) {
      // 40% of chance, enemy doesn't move at all.
      if (Math.random() > 0.6 ) return;

      var randomDirection = this.direction;
      if (Math.random() > 0.95) {
        randomDirection = Math.floor(Math.random() * 4);
        this.direction = randomDirection;
      }

      const ifNotCollided = this.collisionDetect(this.direction, enemies, player, panelWidth, panelHeight, dt)
      if (ifNotCollided) {
        switch(this.direction) {
          case 0: 
            this.y -= this.TANK_SPEED * dt;
            break;
          case 1:
            this.x += this.TANK_SPEED * dt;
            break;
          case 2:
            this.y += this.TANK_SPEED * dt;
            break;
          case 3:
            this.x -= this.TANK_SPEED * dt;
            break;
        }
      }
    }

    randomShoot(dt, player, bullets) {
      // The closer enemy gets to the player, the more fierce it shoots
      if (dist(player, this) <= 240 && Math.random() > 0.15) {
        if (this.reload === 0) {
          this.ifBulletCoolDown = true;
          this.shoot(dt, bullets);
        } else if (this.reload >= this.reloadTime) {
          this.reload = 0;
          this.ifBulletCoolDown = false;
        }
      } else if (Math.random() > 0.4) {
        if (this.reload === 0) {
          this.ifBulletCoolDown = true;
          this.shoot(dt, bullets);
        } else if (this.reload >= this.reloadTime) {
          this.reload = 0;
          this.ifBulletCoolDown = false;
        }
      }
    }

    update(dt, bullets, enemies, player, panelWidth, panelHeight) {

      if (this.status === Statuses.DEAD) {
        return;
      } else if (this.status === Statuses.DYING) {
        if (this.dyingAnimCounter > 0) {
          this.dyingAnimCounter -= dt;
          this.DYING_EXPLOSION_RADIUS += this.DYING_EXPLOSION_R_INCREMENT;
        } else {
          this.status = Statuses.DEAD;
        }
      } else if (this.status === Statuses.ALIVE) {
        // Deal with move
        this.randomMove(enemies, player, panelWidth, panelHeight, dt);

        // Deal with shoot and reload logic
        if (this.ifBulletCoolDown === true) {
          this.reload += dt;
        } 

        this.randomShoot(dt, player, bullets);
      }
    }
  }

  class Game {
    constructor(canvas, ui) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.width = canvas.width;
      this.height = canvas.height;
      this.running = false;
      this.ui = ui;
      this.bullets = [];
      this.enemies = [];
      this.keys = {};
      this.last = null;
      this.player = new Player(this.width / 2, this.height * 3 / 4);
      this.spawnEnemies(3, this.player);
      this._boundLoop = this.loop.bind(this);
      this.setupInput();
      this.winFlag = null;
      this.loseFlag = null;
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame(this._boundLoop);
    }

    spawnEnemies(n, player) {
      function rand(min, max) {
        return Math.random() * (max - min) + min;
      }

      let x = 0, y = 0;
      const maxColumn = this.width / player.WIDTH;
      const maxColumnSpan = maxColumn / n;
      const maxRow = (this.height - player.y) / player.HEIGHT;
      const maxRowSpan = maxRow / n;

      for (let i = 0; i < n; i++) {
        x += rand(player.WIDTH, maxColumnSpan * this.player.WIDTH - 10);
        y += rand(player.HEIGHT, maxRowSpan * this.player.HEIGHT - 10);
        const e = new Enemy(x, y);
        this.enemies.push(e);
      }
    }

    setupInput() {
      window.addEventListener('keydown', (e)=> {
        this.keys[e.key.toLowerCase()] = true;
        this.updateControls();
      });
      window.addEventListener('keyup', (e)=> {
        this.keys[e.key.toLowerCase()] = false;
        this.updateControls();
      });
    }

    updateControls() {
      const k = this.keys;
      this.player.controls.up = k['w'] || k['arrowup'];
      this.player.controls.down = k['s'] || k['arrowdown'];
      this.player.controls.left = k['a'] || k['arrowleft'];
      this.player.controls.right = k['d'] || k['arrowright'];
      this.player.controls.shoot = k['j'] || k[' '];
    }

    loop(timestamp) {
      if (!this.running) return;
      console.log("loop() is called.")
      const dt = Math.min(0.05, (timestamp - this.last)/1000);
      this.last = timestamp;
      this.update(dt);
      this.draw();
      requestAnimationFrame(this._boundLoop);
    }

    stop() {
      this.running = false;
    }

    update(dt) { 
      // update player
      if (this.player.status !== Statuses.DEAD) {
        this.player.update(dt, this.bullets, this.enemies, this.width, this.height);
      } else {
        this.loseFlag = true;
      }

      // update bullets
      for (let i = this.bullets.length - 1; i >= 0; i--){
        const b = this.bullets[i];
        b.update(dt);
        // remove if out of bounds or expired
        if (b.life <= 0 || b.x < -20 || b.x > this.width + 20 || b.y < -20 || b.y > this.height + 20) {
          this.bullets.splice(i, 1);
          continue;
        }
      }

      // update enemies
      if (this.enemies.length !== 0) {
        for (let i = this.enemies.length - 1; i >= 0; i--){
          const e = this.enemies[i];
          if (e.status !== Statuses.DEAD) {
            // update(dt, bullets, enemies, player, panelWidth, panelHeight)
            e.update(dt, this.bullets, this.enemies, this.player, this.width, this.height);
          } else {
            this.enemies.splice(i, 1);
            continue;
          }
        }
      } else {
        this.winFlag = true;
      }
      

      // bullet collisions
      for (let i = this.bullets.length - 1; i >= 0; i--){
        const b = this.bullets[i];
        if (b.owner === 'p'){
          // check enemies
          for (let j = this.enemies.length - 1; j >= 0; j--){
            const e = this.enemies[j];
            if (b.y > e.y && b.y < e.y + e.HEIGHT && b.x > e.x && b.x < e.x + e.WIDTH) {
              e.isShot();
              this.bullets.splice(i, 1);
            }
          }
        } else {
          // enemy bullet -> player
          const p = this.player;
          if (b.y > p.y && b.y < p.y + p.HEIGHT && b.x > p.x && b.x < p.x + p.WIDTH){
            p.isShot();
            this.bullets.splice(i, 1);
          }
        }
      }

      // update UI ui.playerLife.innerHTML
      this.ui.playerLife.textContent = this.player.status === Statuses.ALIVE ? 1 : 0;
      this.ui.enemiesCount.textContent = this.enemies.length;

    }

    draw() {
      const ctx = this.ctx;
      // Reset the canvas evert time draw() is called.
      ctx.clearRect(0, 0, this.width, this.height);

      // draw background grid
      ctx.fillStyle = '#07070a';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.strokeStyle = '#0f0f14';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < this.width; gx += Tank.WIDTH){
        ctx.beginPath(); 
        ctx.moveTo(gx,0); 
        ctx.lineTo(gx,this.height); 
        ctx.stroke();
      }
      for (let gy = 0; gy < this.height; gy += Tank.HEIGHT){
        ctx.beginPath();
        ctx.moveTo(0,gy); 
        ctx.lineTo(this.width,gy); 
        ctx.stroke();
      }

      // draw bullets under tanks
      for (const b of this.bullets) b.draw(ctx);

      // draw enemies
      for (const e of this.enemies) e.draw(ctx);

      // draw player last
      if (this.player.status !== Statuses.DEAD) {
        this.player.draw(ctx);
      }

      // Check the game's status (win / lose)
      if (this.winFlag === true) {
        ctx.font = `40px "Nunito", sans-serif`;
        ctx.fillStyle = "#f0e8ebff";
        ctx.fillText("You won! Have some champagne.", 50, 240);
      }

      if (this.loseFlag === true) {
        ctx.font = `bold 35px "Nunito", sans-serif`;
        ctx.fillStyle = "#aa1b1bff";
        ctx.fillText("You lose. Click button to try again.", 80, 240);
      } 
    }
  }

  /* main() */
  let game = null;
  const startBtn = $("#tankgame-start-btn");
  const restartBtn = $("#tankgame-restart-btn")
  const closeBtn = $("#tankgame-close-btn");
  const canvas = $("#tank-canvas").get(0);
  const ui = {
    playerLife: $("#playerLife").get(0),
    enemiesCount: $("#enemiesCount").get(0)
  };

  startBtn.on("click", function() {
    game = new Game(canvas, ui);
    game.start();
    startBtn.addClass("hidden");
    restartBtn.removeClass("hidden");
  })

  restartBtn.on("click", function() {
    if (!game) return;
    game.stop();
    game = new Game(canvas, ui);
    game.start();
  })

  closeBtn.on("click", function() {
    if (game) { 
      game.stop();
      restartBtn.addClass("hidden");
      startBtn.removeClass("hidden");

      hint1.fillStyle = "rgb(240, 240, 240)";
    hint1.fillRect(0, 0, canvas.width, canvas.height);
    hint1.font = `bold 50px "Nunito", sans-serif`;
    hint1.fillStyle = "#ff3f95";
    hint1.fillText("Press start to play", 140, 260);
    }
  })

})();