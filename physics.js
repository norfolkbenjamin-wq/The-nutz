// ShellShock Live - Overlay Aim Tracer Physics Engine
class OverlayAimTracer {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // Tank positions (in screen coordinates)
        this.playerTank = { x: 200, y: window.innerHeight - 150, radius: 15 };
        this.enemyTank = { x: window.innerWidth - 200, y: window.innerHeight - 150, radius: 15 };
        
        // Dragging
        this.draggingTank = null;
        this.dragOffset = { x: 0, y: 0 };
        
        // Physics parameters
        this.angle = 45;
        this.velocity = 50;
        this.gravity = 9.8;
        this.windSpeed = 0;
        this.windDirection = 0;
        
        // Scale factor
        this.scale = 1.5;
        
        // Trajectory points
        this.trajectoryPoints = [];
        
        // Overlay visibility
        this.showTrajectory = true;
        this.showTanks = true;
        
        this.setupEventListeners();
        this.animate();
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Canvas mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));
        
        // Control sliders
        document.getElementById('windSlider').addEventListener('input', (e) => {
            this.windSpeed = parseFloat(e.target.value);
            document.getElementById('windValue').textContent = `${this.windSpeed}`;
        });
        
        document.getElementById('windDirSlider').addEventListener('input', (e) => {
            this.windDirection = parseFloat(e.target.value);
            document.getElementById('windDirValue').textContent = `${this.windDirection}°`;
        });
        
        document.getElementById('angleSlider').addEventListener('input', (e) => {
            this.angle = parseFloat(e.target.value);
            document.getElementById('angleValue').textContent = `${this.angle}°`;
        });
        
        document.getElementById('velocitySlider').addEventListener('input', (e) => {
            this.velocity = parseFloat(e.target.value);
            document.getElementById('velocityValue').textContent = `${this.velocity}`;
        });
        
        document.getElementById('gravitySlider').addEventListener('input', (e) => {
            this.gravity = parseFloat(e.target.value);
            document.getElementById('gravityValue').textContent = `${this.gravity}`;
        });
    }
    
    onMouseDown(e) {
        const x = e.clientX;
        const y = e.clientY;
        
        // Check if clicking on player tank
        if (this.distance(x, y, this.playerTank.x, this.playerTank.y) < this.playerTank.radius + 15) {
            this.draggingTank = 'player';
            this.dragOffset.x = x - this.playerTank.x;
            this.dragOffset.y = y - this.playerTank.y;
        }
        // Check if clicking on enemy tank
        else if (this.distance(x, y, this.enemyTank.x, this.enemyTank.y) < this.enemyTank.radius + 15) {
            this.draggingTank = 'enemy';
            this.dragOffset.x = x - this.enemyTank.x;
            this.dragOffset.y = y - this.enemyTank.y;
        }
    }
    
    onMouseMove(e) {
        if (!this.draggingTank) return;
        
        const x = e.clientX;
        const y = e.clientY;
        
        if (this.draggingTank === 'player') {
            this.playerTank.x = Math.max(0, Math.min(window.innerWidth, x - this.dragOffset.x));
            this.playerTank.y = Math.max(0, Math.min(window.innerHeight, y - this.dragOffset.y));
        } else if (this.draggingTank === 'enemy') {
            this.enemyTank.x = Math.max(0, Math.min(window.innerWidth, x - this.dragOffset.x));
            this.enemyTank.y = Math.max(0, Math.min(window.innerHeight, y - this.dragOffset.y));
        }
    }
    
    onMouseUp(e) {
        this.draggingTank = null;
    }
    
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
    
    calculateTrajectory() {
        this.trajectoryPoints = [];
        
        const angleRad = (this.angle * Math.PI) / 180;
        
        const vx = this.velocity * Math.cos(angleRad);
        const vy = this.velocity * Math.sin(angleRad);
        
        const windRad = (this.windDirection * Math.PI) / 180;
        const windVx = this.windSpeed * Math.cos(windRad);
        const windVy = this.windSpeed * Math.sin(windRad);
        
        const startX = this.playerTank.x / this.scale;
        const startY = (window.innerHeight - this.playerTank.y) / this.scale;
        
        const dt = 0.01;
        let t = 0;
        let x = startX;
        let y = startY;
        let vx_curr = vx + windVx * 0.1;
        let vy_curr = vy;
        
        while (y > 0 && t < 100) {
            this.trajectoryPoints.push({
                x: Math.round(x * this.scale),
                y: Math.round(window.innerHeight - y * this.scale),
                time: t
            });
            
            vy_curr -= this.gravity * dt;
            vx_curr += (windVx * 0.01);
            
            x += vx_curr * dt;
            y += vy_curr * dt;
            
            t += dt;
        }
    }
    
    calculateStats() {
        if (this.trajectoryPoints.length === 0) {
            return {
                distance: 0,
                flightTime: 0,
                maxHeight: 0,
                windEffect: 0
            };
        }
        
        const dx = this.enemyTank.x - this.playerTank.x;
        const dy = this.enemyTank.y - this.playerTank.y;
        const distance = Math.sqrt(dx * dx + dy * dy) / this.scale;
        
        const flightTime = this.trajectoryPoints[this.trajectoryPoints.length - 1].time;
        
        let maxHeight = 0;
        for (let point of this.trajectoryPoints) {
            const height = window.innerHeight - point.y;
            if (height > maxHeight) maxHeight = height;
        }
        maxHeight = maxHeight / this.scale;
        
        const windRad = (this.windDirection * Math.PI) / 180;
        const windEffect = (this.windSpeed * Math.cos(windRad)) * flightTime;
        
        return {
            distance: distance.toFixed(1),
            flightTime: flightTime.toFixed(2),
            maxHeight: maxHeight.toFixed(1),
            windEffect: windEffect.toFixed(1)
        };
    }
    
    updateUI() {
        const stats = this.calculateStats();
        
        document.getElementById('distance').textContent = `${stats.distance} m`;
        document.getElementById('flightTime').textContent = `${stats.flightTime} s`;
        document.getElementById('maxHeight').textContent = `${stats.maxHeight} m`;
        document.getElementById('windEffect').textContent = `${stats.windEffect} m`;
    }
    
    draw() {
        // Clear canvas (transparent)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.showTrajectory && this.trajectoryPoints.length > 1) {
            // Draw trajectory
            this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(this.trajectoryPoints[0].x, this.trajectoryPoints[0].y);
            for (let i = 1; i < this.trajectoryPoints.length; i++) {
                this.ctx.lineTo(this.trajectoryPoints[i].x, this.trajectoryPoints[i].y);
            }
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // Draw impact point
            const lastPoint = this.trajectoryPoints[this.trajectoryPoints.length - 1];
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
            this.ctx.beginPath();
            this.ctx.arc(lastPoint.x, lastPoint.y, 20, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Draw crosshair at impact
            const crossSize = 15;
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(lastPoint.x - crossSize, lastPoint.y);
            this.ctx.lineTo(lastPoint.x + crossSize, lastPoint.y);
            this.ctx.moveTo(lastPoint.x, lastPoint.y - crossSize);
            this.ctx.lineTo(lastPoint.x, lastPoint.y + crossSize);
            this.ctx.stroke();
        }
        
        if (this.showTanks) {
            // Draw player tank
            this.drawTank(this.playerTank, '#00FF00', '🟢');
            
            // Draw enemy tank
            this.drawTank(this.enemyTank, '#FF0000', '🔴');
            
            // Draw cannon
            this.drawCannon(this.playerTank, '#00FF00');
            
            // Draw distance line
            this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([3, 3]);
            this.ctx.beginPath();
            this.ctx.moveTo(this.playerTank.x, this.playerTank.y);
            this.ctx.lineTo(this.enemyTank.x, this.enemyTank.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }
    
    drawTank(tank, color, emoji) {
        // Tank body
        this.ctx.fillStyle = color;
        this.ctx.globalAlpha = 0.8;
        this.ctx.fillRect(tank.x - tank.radius, tank.y - tank.radius, tank.radius * 2, tank.radius * 2);
        
        // Tank outline
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 1;
        this.ctx.strokeRect(tank.x - tank.radius, tank.y - tank.radius, tank.radius * 2, tank.radius * 2);
        
        // Emoji
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(emoji, tank.x, tank.y);
    }
    
    drawCannon(tank, color) {
        const angleRad = (this.angle * Math.PI) / 180;
        const cannonLength = 30;
        const endX = tank.x + cannonLength * Math.cos(angleRad);
        const endY = tank.y - cannonLength * Math.sin(angleRad);
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.globalAlpha = 0.9;
        this.ctx.beginPath();
        this.ctx.moveTo(tank.x, tank.y);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    }
    
    animate() {
        this.calculateTrajectory();
        this.updateUI();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Global functions
function resetPositions() {
    const tracer = window.overlayTracer;
    tracer.playerTank = { x: 200, y: window.innerHeight - 150, radius: 15 };
    tracer.enemyTank = { x: window.innerWidth - 200, y: window.innerHeight - 150, radius: 15 };
}

function toggleOverlay() {
    const tracer = window.overlayTracer;
    tracer.showTrajectory = !tracer.showTrajectory;
    tracer.showTanks = !tracer.showTanks;
}

function toggleControls() {
    const controls = document.getElementById('controls');
    const btn = document.getElementById('toggleBtn');
    
    controls.classList.toggle('hidden');
    
    if (controls.classList.contains('hidden')) {
        btn.textContent = '▶ Show Controls';
        btn.classList.add('collapsed');
    } else {
        btn.textContent = '▼ Hide Controls';
        btn.classList.remove('collapsed');
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    window.overlayTracer = new OverlayAimTracer();
});
