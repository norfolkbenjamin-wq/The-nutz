// ShellShock Live - Aim Tracer Physics Engine
class AimTracer {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // Tank positions (in pixels)
        this.playerTank = { x: 100, y: this.canvas.height - 100, radius: 20 };
        this.enemyTank = { x: this.canvas.width - 100, y: this.canvas.height - 100, radius: 20 };
        
        // Dragging
        this.draggingTank = null;
        this.dragOffset = { x: 0, y: 0 };
        
        // Physics parameters
        this.angle = 45;
        this.velocity = 50;
        this.gravity = 9.8;
        this.windSpeed = 0;
        this.windDirection = 0;
        
        // Scale factor (pixels per meter)
        this.scale = 2;
        
        // Trajectory points
        this.trajectoryPoints = [];
        
        this.setupEventListeners();
        this.animate();
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - 200; // Account for controls and info panel
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Canvas mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        
        // Control sliders
        document.getElementById('windSlider').addEventListener('input', (e) => {
            this.windSpeed = parseFloat(e.target.value);
            document.getElementById('windValue').textContent = `${this.windSpeed} m/s`;
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
            document.getElementById('velocityValue').textContent = `${this.velocity} m/s`;
        });
        
        document.getElementById('gravitySlider').addEventListener('input', (e) => {
            this.gravity = parseFloat(e.target.value);
            document.getElementById('gravityValue').textContent = `${this.gravity} m/s²`;
        });
    }
    
    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check if clicking on player tank
        if (this.distance(x, y, this.playerTank.x, this.playerTank.y) < this.playerTank.radius + 10) {
            this.draggingTank = 'player';
            this.dragOffset.x = x - this.playerTank.x;
            this.dragOffset.y = y - this.playerTank.y;
        }
        // Check if clicking on enemy tank
        else if (this.distance(x, y, this.enemyTank.x, this.enemyTank.y) < this.enemyTank.radius + 10) {
            this.draggingTank = 'enemy';
            this.dragOffset.x = x - this.enemyTank.x;
            this.dragOffset.y = y - this.enemyTank.y;
        }
    }
    
    onMouseMove(e) {
        if (!this.draggingTank) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.draggingTank === 'player') {
            this.playerTank.x = Math.max(0, Math.min(this.canvas.width, x - this.dragOffset.x));
            this.playerTank.y = Math.max(0, Math.min(this.canvas.height, y - this.dragOffset.y));
        } else if (this.draggingTank === 'enemy') {
            this.enemyTank.x = Math.max(0, Math.min(this.canvas.width, x - this.dragOffset.x));
            this.enemyTank.y = Math.max(0, Math.min(this.canvas.height, y - this.dragOffset.y));
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
        
        // Convert angle to radians
        const angleRad = (this.angle * Math.PI) / 180;
        
        // Initial velocity components
        const vx = this.velocity * Math.cos(angleRad);
        const vy = this.velocity * Math.sin(angleRad);
        
        // Wind effect (convert to m/s components)
        const windRad = (this.windDirection * Math.PI) / 180;
        const windVx = this.windSpeed * Math.cos(windRad);
        const windVy = this.windSpeed * Math.sin(windRad);
        
        // Starting position in meters
        const startX = this.playerTank.x / this.scale;
        const startY = (this.canvas.height - this.playerTank.y) / this.scale;
        
        // Time step
        const dt = 0.01;
        let t = 0;
        let x = startX;
        let y = startY;
        let vx_curr = vx + windVx * 0.1; // Wind affects velocity slightly
        let vy_curr = vy;
        
        // Simulate trajectory
        while (y > 0 && t < 100) {
            this.trajectoryPoints.push({
                x: Math.round(x * this.scale),
                y: Math.round(this.canvas.height - y * this.scale),
                time: t
            });
            
            // Apply physics
            vy_curr -= this.gravity * dt;
            vx_curr += (windVx * 0.01); // Continuous wind effect
            
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
        
        // Distance between tanks
        const dx = this.enemyTank.x - this.playerTank.x;
        const dy = this.enemyTank.y - this.playerTank.y;
        const distance = Math.sqrt(dx * dx + dy * dy) / this.scale;
        
        // Flight time (last point)
        const flightTime = this.trajectoryPoints[this.trajectoryPoints.length - 1].time;
        
        // Max height
        let maxHeight = 0;
        for (let point of this.trajectoryPoints) {
            const height = this.canvas.height - point.y;
            if (height > maxHeight) maxHeight = height;
        }
        maxHeight = maxHeight / this.scale;
        
        // Wind effect (horizontal displacement due to wind)
        const windRad = (this.windDirection * Math.PI) / 180;
        const windEffect = (this.windSpeed * Math.cos(windRad)) * flightTime;
        
        return {
            distance: distance.toFixed(2),
            flightTime: flightTime.toFixed(2),
            maxHeight: maxHeight.toFixed(2),
            windEffect: windEffect.toFixed(2)
        };
    }
    
    updateUI() {
        const stats = this.calculateStats();
        
        document.getElementById('distance').textContent = `${stats.distance} m`;
        document.getElementById('flightTime').textContent = `${stats.flightTime} s`;
        document.getElementById('maxHeight').textContent = `${stats.maxHeight} m`;
        document.getElementById('windEffect').textContent = `${stats.windEffect} m`;
        
        document.getElementById('playerTankPos').textContent = 
            `${Math.round(this.playerTank.x / this.scale)}, ${Math.round((this.canvas.height - this.playerTank.y) / this.scale)}`;
        
        document.getElementById('enemyTankPos').textContent = 
            `${Math.round(this.enemyTank.x / this.scale)}, ${Math.round((this.canvas.height - this.enemyTank.y) / this.scale)}`;
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(135, 206, 235, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw ground
        this.ctx.fillStyle = '#8B7355';
        this.ctx.fillRect(0, this.canvas.height - 50, this.canvas.width, 50);
        
        // Draw grid
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        const gridSize = this.scale * 10;
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // Draw trajectory
        if (this.trajectoryPoints.length > 1) {
            this.ctx.strokeStyle = '#FFFF00';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(this.trajectoryPoints[0].x, this.trajectoryPoints[0].y);
            for (let i = 1; i < this.trajectoryPoints.length; i++) {
                this.ctx.lineTo(this.trajectoryPoints[i].x, this.trajectoryPoints[i].y);
            }
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
        
        // Draw player tank
        this.drawTank(this.playerTank, '#00FF00', 'YOUR TANK');
        
        // Draw enemy tank
        this.drawTank(this.enemyTank, '#FF0000', 'ENEMY');
        
        // Draw cannon from player tank
        this.drawCannon(this.playerTank, '#00FF00');
        
        // Draw wind indicator
        this.drawWindIndicator();
        
        // Draw trajectory impact point
        if (this.trajectoryPoints.length > 0) {
            const lastPoint = this.trajectoryPoints[this.trajectoryPoints.length - 1];
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(lastPoint.x, lastPoint.y, 15, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#FF0000';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }
    
    drawTank(tank, color, label) {
        // Tank body
        this.ctx.fillStyle = color;
        this.ctx.fillRect(tank.x - tank.radius, tank.y - tank.radius, tank.radius * 2, tank.radius * 2);
        
        // Tank outline
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(tank.x - tank.radius, tank.y - tank.radius, tank.radius * 2, tank.radius * 2);
        
        // Label
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(label, tank.x, tank.y - tank.radius - 10);
    }
    
    drawCannon(tank, color) {
        const angleRad = (this.angle * Math.PI) / 180;
        const cannonLength = 40;
        const endX = tank.x + cannonLength * Math.cos(angleRad);
        const endY = tank.y - cannonLength * Math.sin(angleRad);
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(tank.x, tank.y);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
    }
    
    drawWindIndicator() {
        const windRad = (this.windDirection * Math.PI) / 180;
        const windX = 50;
        const windY = 30;
        const arrowLength = Math.abs(this.windSpeed) * 2;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(10, 10, 100, 50);
        this.ctx.strokeStyle = '#00FF00';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(10, 10, 100, 50);
        
        // Wind arrow
        this.ctx.strokeStyle = '#FFFF00';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(windX, windY);
        const arrowEndX = windX + arrowLength * Math.cos(windRad);
        const arrowEndY = windY + arrowLength * Math.sin(windRad);
        this.ctx.lineTo(arrowEndX, arrowEndY);
        this.ctx.stroke();
        
        // Arrowhead
        const headlen = 8;
        const angle1 = windRad + Math.PI / 6;
        const angle2 = windRad - Math.PI / 6;
        this.ctx.beginPath();
        this.ctx.moveTo(arrowEndX, arrowEndY);
        this.ctx.lineTo(arrowEndX - headlen * Math.cos(angle1), arrowEndY - headlen * Math.sin(angle1));
        this.ctx.moveTo(arrowEndX, arrowEndY);
        this.ctx.lineTo(arrowEndX - headlen * Math.cos(angle2), arrowEndY - headlen * Math.sin(angle2));
        this.ctx.stroke();
        
        // Wind label
        this.ctx.fillStyle = '#FFFF00';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('WIND', 20, 25);
    }
    
    animate() {
        this.calculateTrajectory();
        this.updateUI();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Global function for reset button
function resetPositions() {
    const tracer = window.aimTracer;
    tracer.playerTank = { x: 100, y: tracer.canvas.height - 100, radius: 20 };
    tracer.enemyTank = { x: tracer.canvas.width - 100, y: tracer.canvas.height - 100, radius: 20 };
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    window.aimTracer = new AimTracer();
});
