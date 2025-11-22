(() => {
  /* --- Helpers --- */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist(a, b) { let dx = a.x - b.x, dy = a.y-b.y; return Math.hypot(dx, dy); }
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function angleTo(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }

  /* ===== Entities ===== */
  class Bullet {
    constructor(x, y, angle, owner) {
      this.x = x; 
      this.y = y;
      const speed = 320;
      this.vx = Math.cos(angle)*speed;
      this.vy = Math.sin(angle)*speed;
      this.radius = 3;
      this.life = 2.5; // seconds
      this.owner = owner; // "player" or "enemy"
    }
    update(dt) { 
      this.x += this.vx * dt; 
      this.y += this.vy * dt; 
      this.life -= dt; 
    }

    draw(ctx){
      ctx.beginPath();
      ctx.fillStyle = (this.owner === 'player') ? '#ffd' : '#f88';
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
      ctx.fill();
    }
  }

  class Tank {
    constructor(x, y, color = 'lime') {
      this.x = x; 
      this.y = y;
      this.direction = 0; // 0: up, 1: right, 2: down, 3: left
      this.speed = 120;
      this.dyingCounter = 0;
      this.reload = 0; // Reload bullets
      this.reloadTime = 0.35;
      this.life = 1;

      // For drawing purpose
      this.w = 28; 
      this.h = 36;
      this.color = color;  
    }

    shoot(bullets) {
      if (this.reload > 0) return;
      const muzzleX = this.x + Math.cos(this.angle) * (this.h/2 + 4);
      const muzzleY = this.y + Math.sin(this.angle) * (this.h/2 + 4);
      bullets.push(new Bullet(muzzleX, muzzleY, this.angle, this instanceof Enemy ? 'enemy' : 'player'));
      this.reload = this.reloadTime;
    }
    takeDamage(amount){
      this.hp = Math.max(0, this.hp - amount);
    }
    draw(ctx){
      ctx.save();
      ctx.translate(this.x, this.y);
      // body
      ctx.rotate(this.bodyAngle);
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
      // treads
      ctx.fillStyle = '#222';
      ctx.fillRect(-this.w/2 - 4, -this.h/2, 4, this.h);
      ctx.fillRect(this.w/2, -this.h/2, 4, this.h);
      ctx.restore();
      // turret
      ctx.save();
      ctx.translate(this.x, this.y);
      // ctx.rotate(this.angle);
      ctx.fillStyle = '#333';
      ctx.fillRect(-6, -8, 12, 16); // turret base
      ctx.fillStyle = '#222';
      ctx.fillRect(-3, -this.h/2 - 8, 6, this.h/2 + 8); // barrel
      ctx.restore();

      // hp bar
      const barW = 40;
      ctx.fillStyle = '#333';
      ctx.fillRect(this.x - barW/2, this.y - this.h/2 - 12, barW, 6);
      const pct = this.hp/this.maxHp;
      ctx.fillStyle = pct>0.5 ? '#6c6' : (pct>0.2 ? '#eea' : '#f66');
      ctx.fillRect(this.x - barW/2 + 1, this.y - this.h/2 - 11, (barW-2)*pct, 4);
    }
  }

  class Player extends Tank {
    constructor(x,y){
      super(x,y,'#6cf');
      this.controls = {up:false,down:false,left:false,right:false,shoot:false};
    }
    update(dt, inputAngle){
      // movement relative to bodyAngle
      let vx=0, vy=0;
      if(this.controls.up) vy -= 1;
      if(this.controls.down) vy += 1;
      if(this.controls.left) vx -= 1;
      if(this.controls.right) vx += 1;
      // normalize
      if (vx!==0 || vy!==0) {
        const mag = Math.hypot(vx,vy);
        vx /= mag; vy /= mag;
        // move in world coords (we'll move with vx,vy)
        this.x += vx * this.speed * dt;
        this.y += vy * this.speed * dt;
        // body faces movement direction
        this.bodyAngle = Math.atan2(vy, vx);
      }
      // turret points to mouse / inputAngle (if provided)
      if (typeof inputAngle === 'number') this.angle = inputAngle;
      if (this.reload > 0) this.reload -= dt;
    }
  }

  class Enemy extends Tank {
    constructor(x,y) {
      super(x,y,'#f96');
      this.reloadTime = 0.9;
      this.target = null;
      this.state = 'idle';
      this._aiTimer = rand(0.5,2);
    }
    update(dt, player, bullets){
      // simple chase AI
      const d = dist(this, player);
      if (d < 220) {
        // chase
        const ang = angleTo(this, player);
        this.bodyAngle = ang;
        this.x += Math.cos(ang)*this.speed*0.6*dt;
        this.y += Math.sin(ang)*this.speed*0.6*dt;
        // turret face player
        this.angle = ang;
        // shoot occasionally when roughly facing
        if (Math.random() < 0.6*dt && this.reload <= 0 && d < 260) {
          this.shoot(bullets);
        }
      } else {
        // wander
        this._aiTimer -= dt;
        if (this._aiTimer <= 0) {
          this._aiDir = rand(0,Math.PI*2);
          this._aiTimer = rand(0.6,1.8);
        }
        this.bodyAngle = this._aiDir || 0;
        this.x += Math.cos(this.bodyAngle)*this.speed*0.25*dt;
        this.y += Math.sin(this.bodyAngle)*this.speed*0.25*dt;
        this.angle = this.bodyAngle;
      }
      if (this.reload > 0) this.reload -= dt;
    }
  }

  /* ===== Game engine ===== */
  class Game {
    constructor(canvas, ui) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ui = ui;
      this.width = canvas.width;
      this.height = canvas.height;
      this.bullets = [];
      this.enemies = [];
      this.last = null;
      this.player = new Player(this.width/2, this.height/2);
      this.spawnEnemies(3);
      this.mouse = {x:this.width/2, y:this.height/2, down:false};
      this.running = false;
      this._boundLoop = this.loop.bind(this);

      // clamp inside game area
      this.boundary = {x:0,y:0,w:this.width,h:this.height};
      this.setupInput();
    }

    setupInput(){
      // keys
      this.keys = {};
      window.addEventListener('keydown', (e)=> {
        if (e.key === ' '){ e.preventDefault(); this.player.controls.shoot = true; }
        this.keys[e.key.toLowerCase()] = true;
        this.updateControls();
      });
      window.addEventListener('keyup', (e)=> {
        if (e.key === ' '){ e.preventDefault(); this.player.controls.shoot = false; }
        this.keys[e.key.toLowerCase()] = false;
        this.updateControls();
      });
      // mouse
      this.canvas.addEventListener('mousemove', (e)=> {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
      });
      this.canvas.addEventListener('mousedown', (e)=> {
        if (e.button === 0) this.mouse.down = true;
      });
      this.canvas.addEventListener('mouseup', (e)=> {
        if (e.button === 0) this.mouse.down = false;
      });
    }

    updateControls(){
      const k = this.keys;
      this.player.controls.up = k['w'] || k['arrowup'];
      this.player.controls.down = k['s'] || k['arrowdown'];
      this.player.controls.left = k['a'] || k['arrowleft'];
      this.player.controls.right = k['d'] || k['arrowright'];
      // shoot handled via mouse or space (space sets player.controls.shoot true in keydown)
    }

    spawnEnemies(n){
      this.enemies.length = 0;
      for (let i=0;i<n;i++){
        const x = rand(40, this.width-40);
        const y = rand(40, this.height-40);
        const e = new Enemy(x,y);
        this.enemies.push(e);
      }
    }

    start(){
      if (this.running) return;
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame(this._boundLoop);
    }

    stop(){
      this.running = false;
    }

    loop(ts){
      if (!this.running) return;
      const dt = Math.min(0.05, (ts - this.last)/1000);
      this.last = ts;
      this.update(dt);
      this.draw();
      requestAnimationFrame(this._boundLoop);
    }

    update(dt){
      // player aim
      const aimAngle = Math.atan2(this.mouse.y - this.player.y, this.mouse.x - this.player.x);
      // update player
      this.player.update(dt, aimAngle);
      // shooting
      if (this.mouse.down || this.player.controls.shoot) {
        if (this.player.reload <= 0) {
          this.player.shoot(this.bullets);
        }
      }

      // update bullets
      for (let i=this.bullets.length-1;i>=0;i--){
        const b = this.bullets[i];
        b.update(dt);
        // remove if out of bounds or expired
        if (b.life <= 0 || b.x < -20 || b.x > this.width+20 || b.y < -20 || b.y > this.height+20){
          this.bullets.splice(i,1);
          continue;
        }
      }

      // update enemies
      for (let i=this.enemies.length-1;i>=0;i--){
        const e = this.enemies[i];
        e.update(dt, this.player, this.bullets);
        // clamp position
        e.x = clamp(e.x, 16, this.width-16);
        e.y = clamp(e.y, 16, this.height-16);
        if (e.hp <= 0){
          this.enemies.splice(i,1);
        }
      }

      // bullet collisions
      for (let i=this.bullets.length-1;i>=0;i--){
        const b = this.bullets[i];
        if (b.owner === 'player'){
          // check enemies
          for (let j=this.enemies.length-1;j>=0;j--){
            const e = this.enemies[j];
            if (Math.hypot(b.x-e.x, b.y-e.y) < e.h/2 + b.radius){
              e.takeDamage(35);
              this.bullets.splice(i,1); break;
            }
          }
        } else {
          // enemy bullet -> player
          if (Math.hypot(b.x - this.player.x, b.y - this.player.y) < this.player.h/2 + b.radius){
            this.player.takeDamage(18);
            this.bullets.splice(i,1);
          }
        }
      }

      // simple enemy collision push (prevents stacking)
      for (let i=0;i<this.enemies.length;i++){
        for (let j=i+1;j<this.enemies.length;j++){
          const a = this.enemies[i], b = this.enemies[j];
          const d = Math.hypot(a.x-b.x, a.y-b.y);
          const min = 28;
          if (d < min && d>0){
            const overlap = (min - d) * 0.5;
            const nx = (a.x - b.x)/d, ny = (a.y - b.y)/d;
            a.x += nx * overlap;
            a.y += ny * overlap;
            b.x -= nx * overlap;
            b.y -= ny * overlap;
          }
        }
      }

      // clamp player
      this.player.x = clamp(this.player.x, 16, this.width-16);
      this.player.y = clamp(this.player.y, 16, this.height-16);

      // update UI
      this.ui.playerHp.textContent = Math.round(this.player.hp);
      this.ui.enemiesCount.textContent = this.enemies.length;
      this.ui.bulletsCount.textContent = this.bullets.length;
    }

    draw(){
      const ctx = this.ctx;
      ctx.clearRect(0,0,this.width,this.height);
      // background grid
      ctx.fillStyle = '#07070a';
      ctx.fillRect(0,0,this.width,this.height);
      ctx.strokeStyle = '#0f0f14';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < this.width; gx += 40){
        ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,this.height); ctx.stroke();
      }
      for (let gy = 0; gy < this.height; gy += 40){
        ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(this.width,gy); ctx.stroke();
      }

      // draw bullets under tanks
      for (const b of this.bullets) b.draw(ctx);

      // draw enemies
      for (const e of this.enemies) e.draw(ctx);

      // draw player last
      this.player.draw(ctx);

      // optional: draw debug mouse aim
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.arc(this.mouse.x, this.mouse.y, 6, 0, Math.PI*2); ctx.fill();
    }
  } // end Game

  /* ===== UI wiring ===== */
  const openBtn = document.getElementById('openBtn');
  const gameWindow = document.getElementById('gameWindow');
  const closeBtn = document.getElementById('closeBtn');
  const restartBtn = document.getElementById('restartBtn');
  const canvas = document.getElementById('gameCanvas');
  const ui = {
    playerHp: document.getElementById('playerHp'),
    enemiesCount: document.getElementById('enemiesCount'),
    bulletsCount: document.getElementById('bulletsCount')
  };

  let game = null;

  function openWindow(){
    gameWindow.style.display = 'block';
    gameWindow.setAttribute('aria-hidden','false');
    // create game instance (fresh)
    game = new Game(canvas, ui);
    game.start();
  }
  function closeWindow(){
    if (game) game.stop();
    gameWindow.style.display = 'none';
    gameWindow.setAttribute('aria-hidden','true');
  }
  function restartGame(){
    if (game) { game.stop(); }
    // re-create game fresh
    game = new Game(canvas, ui);
    game.start();
  }

  openBtn.addEventListener('click', openWindow);
  closeBtn.addEventListener('click', closeWindow);
  restartBtn.addEventListener('click', restartGame);

  // Allow spacebar shooting while focused on page
  window.addEventListener('keydown', (e)=> { if (e.key === ' '){ e.preventDefault(); } });

})();