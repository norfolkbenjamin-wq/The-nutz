#!/usr/bin/env python3.14
"""
ShellShock Live - Automatic Aim Tracer Overlay
A Python overlay tool that calculates ballistics, power, and wind physics in real-time
"""

import tkinter as tk
from tkinter import Canvas
import math
import time
from dataclasses import dataclass
from typing import List, Tuple


@dataclass
class Vector2:
    """2D Vector for positions"""
    x: float
    y: float
    
    def distance_to(self, other: 'Vector2') -> float:
        """Calculate distance to another vector"""
        return math.sqrt((other.x - self.x) ** 2 + (other.y - self.y) ** 2)
    
    def __add__(self, other: 'Vector2') -> 'Vector2':
        return Vector2(self.x + other.x, self.y + other.y)
    
    def __sub__(self, other: 'Vector2') -> 'Vector2':
        return Vector2(self.x - other.x, self.y - other.y)
    
    def __mul__(self, scalar: float) -> 'Vector2':
        return Vector2(self.x * scalar, self.y * scalar)


class Tank:
    """Represents a tank with position and rendering"""
    def __init__(self, x: float, y: float, color: str, label: str):
        self.pos = Vector2(x, y)
        self.radius = 15
        self.color = color
        self.label = label
        self.dragging = False
        self.drag_offset = Vector2(0, 0)
    
    def contains_point(self, x: float, y: float) -> bool:
        """Check if point is within tank bounds"""
        return self.pos.distance_to(Vector2(x, y)) < self.radius + 15
    
    def draw(self, canvas: Canvas, scale: float = 1.0):
        """Draw tank on canvas"""
        x1 = self.pos.x - self.radius
        y1 = self.pos.y - self.radius
        x2 = self.pos.x + self.radius
        y2 = self.pos.y + self.radius
        
        canvas.create_rectangle(x1, y1, x2, y2, fill=self.color, outline='white', width=2)
        canvas.create_text(self.pos.x, self.pos.y, text=self.label, fill=self.color, font=('Arial', 14, 'bold'))


class BallisticsCalculator:
    """Advanced ballistics calculations for exact hits"""
    
    @staticmethod
    def calculate_angle_and_power(player_pos: Vector2, enemy_pos: Vector2, gravity: float = 9.8) -> Tuple[float, float]:
        """
        Calculate the exact angle and power (velocity) needed to hit target.
        Returns: (angle_degrees, power)
        """
        dx = (enemy_pos.x - player_pos.x) / 1.5
        dy = (player_pos.y - enemy_pos.y) / 1.5
        
        # For horizontal shot at same height, optimal angle is 45°
        # For targets at different heights, we need to calculate both angle and velocity
        
        if abs(dx) < 0.1:
            return 45.0, 50.0
        
        # We'll use 45° as the launch angle (optimal range angle)
        # Then calculate required velocity to hit that exact point
        angle_rad = math.radians(45.0)
        
        # From projectile motion: x = v*cos(θ)*t, y = v*sin(θ)*t - 0.5*g*t²
        # Eliminate t: y = x*tan(θ) - (g*x²)/(2*v²*cos²(θ))
        # Solve for v²: v² = (g*x²) / (2*cos²(θ)*(x*tan(θ) - y))
        
        cos_angle = math.cos(angle_rad)
        sin_angle = math.sin(angle_rad)
        tan_angle = math.tan(angle_rad)
        
        denominator = 2 * (cos_angle ** 2) * (dx * tan_angle - dy)
        
        if denominator <= 0:
            # Target too high or behind, use high angle
            angle_rad = math.radians(60.0)
            cos_angle = math.cos(angle_rad)
            sin_angle = math.sin(angle_rad)
            tan_angle = math.tan(angle_rad)
            denominator = 2 * (cos_angle ** 2) * (dx * tan_angle - dy)
            
            if denominator <= 0:
                return 60.0, 100.0
        
        v_squared = (gravity * dx * dx) / denominator
        
        if v_squared < 0:
            return 45.0, 100.0
        
        power = math.sqrt(v_squared)
        power = max(10, min(100, power))  # Clamp power between 10-100
        
        return 45.0, power
    
    @staticmethod
    def calculate_angle_for_power(player_pos: Vector2, enemy_pos: Vector2, power: float, gravity: float = 9.8) -> float:
        """
        Calculate the angle needed for a given power to hit the target.
        Uses the optimal angle that minimizes energy waste.
        """
        dx = (enemy_pos.x - player_pos.x) / 1.5
        dy = (player_pos.y - enemy_pos.y) / 1.5
        
        if abs(dx) < 0.1:
            return 45.0
        
        if power == 0:
            return 45.0
        
        v_squared = power * power
        
        # y = x*tan(θ) - (g*x²)/(2*v²*cos²(θ))
        # Rearrange: tan(θ) = (2*v²*dy/x + g*x) / (2*v²)
        
        numerator = (2 * v_squared * dy) / dx + gravity * dx
        denominator = 2 * v_squared
        
        tan_angle = numerator / denominator
        
        # Get both possible angles
        angle_rad_1 = math.atan(tan_angle)
        angle_deg_1 = math.degrees(angle_rad_1)
        
        # Higher angle solution
        angle_deg_2 = 90.0 - angle_deg_1
        
        # Return the angle that's between 0 and 90
        if 0 <= angle_deg_1 <= 90:
            return max(0, min(90, angle_deg_1))
        elif 0 <= angle_deg_2 <= 90:
            return max(0, min(90, angle_deg_2))
        else:
            return 45.0


class Physics:
    """Ballistics and physics calculations"""
    def __init__(self, gravity: float = 9.8):
        self.gravity = gravity
        self.velocity = 50.0
        self.wind_speed = 0.0
        self.wind_direction = 0.0
        self.scale = 1.5
        self.calculator = BallisticsCalculator()
    
    def calculate_optimal_trajectory(self, player_pos: Vector2, enemy_pos: Vector2) -> Tuple[float, float]:
        """Calculate optimal angle and power to hit target"""
        angle, power = self.calculator.calculate_angle_and_power(player_pos, enemy_pos, self.gravity)
        self.velocity = power
        return angle, power
    
    def calculate_trajectory(self, start_pos: Vector2, angle: float, power: float, dt: float = 0.01) -> List[Vector2]:
        """Calculate projectile trajectory"""
        trajectory = []
        
        angle_rad = (angle * math.pi) / 180
        vx = power * math.cos(angle_rad)
        vy = power * math.sin(angle_rad)
        
        # Wind components
        wind_rad = (self.wind_direction * math.pi) / 180
        wind_vx = self.wind_speed * math.cos(wind_rad)
        wind_vy = self.wind_speed * math.sin(wind_rad)
        
        x = start_pos.x / self.scale
        y = (start_pos.y / self.scale)
        
        vx_curr = vx + wind_vx * 0.1
        vy_curr = vy
        t = 0
        
        while y > 0 and t < 100:
            trajectory.append(Vector2(x * self.scale, y * self.scale))
            
            vy_curr -= self.gravity * dt
            vx_curr += (wind_vx * 0.01)
            
            x += vx_curr * dt
            y += vy_curr * dt
            t += dt
        
        return trajectory
    
    def calculate_stats(self, player_pos: Vector2, enemy_pos: Vector2, trajectory: List[Vector2], angle: float, power: float) -> dict:
        """Calculate ballistics statistics"""
        if not trajectory:
            return {'distance': 0, 'flight_time': 0, 'max_height': 0, 'wind_effect': 0, 'accuracy': 0}
        
        dx = enemy_pos.x - player_pos.x
        dy = enemy_pos.y - player_pos.y
        distance = math.sqrt(dx ** 2 + dy ** 2) / self.scale
        
        flight_time = (len(trajectory) * 0.01)
        
        max_height = 0
        for point in trajectory:
            height = abs(point.y - player_pos.y) / self.scale
            if height > max_height:
                max_height = height
        
        wind_rad = (self.wind_direction * math.pi) / 180
        wind_effect = (self.wind_speed * math.cos(wind_rad)) * flight_time
        
        # Calculate accuracy
        if trajectory:
            last_point = trajectory[-1]
            impact_dist = last_point.distance_to(enemy_pos)
            accuracy = max(0, 100 - (impact_dist / 3))
        else:
            accuracy = 0
        
        return {
            'distance': round(distance, 1),
            'flight_time': round(flight_time, 2),
            'max_height': round(max_height, 1),
            'wind_effect': round(wind_effect, 1),
            'accuracy': round(accuracy, 0),
            'angle': round(angle, 1),
            'power': round(power, 1)
        }


class AimTracerOverlay:
    """Main overlay application"""
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("ShellShock Live - Aim Tracer")
        self.root.geometry("1280x720")
        self.root.attributes('-topmost', True)
        self.root.attributes('-alpha', 0.95)
        
        # Canvas setup
        self.canvas = Canvas(root, bg='black', highlightthickness=0, cursor='crosshair')
        self.canvas.pack(fill=tk.BOTH, expand=True)
        self.canvas.bind('<Button-1>', self.on_mouse_down)
        self.canvas.bind('<B1-Motion>', self.on_mouse_move)
        self.canvas.bind('<ButtonRelease-1>', self.on_mouse_up)
        
        # Control frame
        self.control_frame = tk.Frame(root, bg='#1a1a1a', relief=tk.SUNKEN, bd=2)
        self.control_frame.pack(side=tk.BOTTOM, fill=tk.X)
        
        # Physics engine
        self.physics = Physics()
        
        # Tanks
        self.player_tank = Tank(200, 600, '#00FF00', '🟢')
        self.enemy_tank = Tank(1080, 600, '#FF0000', '🔴')
        
        # Trajectory and stats
        self.trajectory: List[Vector2] = []
        self.current_angle = 0.0
        self.current_power = 50.0
        self.stats = {}
        
        # UI Variables
        self.wind_var = tk.DoubleVar(value=0.0)
        self.wind_dir_var = tk.DoubleVar(value=0.0)
        self.gravity_var = tk.DoubleVar(value=9.8)
        
        self.setup_controls()
        self.update_loop()
    
    def setup_controls(self):
        """Setup control panel"""
        # Title
        title_label = tk.Label(self.control_frame, text='🎮 ShellShock Live - Auto Aim Tracer | Drag dots to set positions | Auto calculates ANGLE & POWER', 
                               bg='#1a1a1a', fg='#00FF00', font=('Courier', 10, 'bold'))
        title_label.pack(side=tk.LEFT, padx=10, pady=5)
        
        # Wind speed control
        tk.Label(self.control_frame, text='Wind:', bg='#1a1a1a', fg='#FFFF00', font=('Courier', 9)).pack(side=tk.LEFT, padx=5)
        wind_scale = tk.Scale(self.control_frame, from_=-50, to=50, orient=tk.HORIZONTAL, 
                             variable=self.wind_var, bg='#333', fg='#00FF00', length=100)
        wind_scale.pack(side=tk.LEFT, padx=2)
        self.wind_label = tk.Label(self.control_frame, text='0', bg='#1a1a1a', fg='#00FF00', font=('Courier', 9), width=4)
        self.wind_label.pack(side=tk.LEFT, padx=2)
        
        # Wind direction control
        tk.Label(self.control_frame, text='Dir:', bg='#1a1a1a', fg='#FFFF00', font=('Courier', 9)).pack(side=tk.LEFT, padx=5)
        wind_dir_scale = tk.Scale(self.control_frame, from_=0, to=360, orient=tk.HORIZONTAL, 
                                  variable=self.wind_dir_var, bg='#333', fg='#00FF00', length=100)
        wind_dir_scale.pack(side=tk.LEFT, padx=2)
        self.wind_dir_label = tk.Label(self.control_frame, text='0°', bg='#1a1a1a', fg='#00FF00', font=('Courier', 9), width=4)
        self.wind_dir_label.pack(side=tk.LEFT, padx=2)
        
        # Gravity control
        tk.Label(self.control_frame, text='G:', bg='#1a1a1a', fg='#FFFF00', font=('Courier', 9)).pack(side=tk.LEFT, padx=5)
        gravity_scale = tk.Scale(self.control_frame, from_=5, to=30, orient=tk.HORIZONTAL, 
                                variable=self.gravity_var, bg='#333', fg='#00FF00', length=100, resolution=0.1)
        gravity_scale.pack(side=tk.LEFT, padx=2)
        self.gravity_label = tk.Label(self.control_frame, text='9.8', bg='#1a1a1a', fg='#00FF00', font=('Courier', 9), width=4)
        self.gravity_label.pack(side=tk.LEFT, padx=2)
        
        # Info labels
        tk.Label(self.control_frame, text='|', bg='#1a1a1a', fg='#00FF00').pack(side=tk.LEFT, padx=5)
        
        self.distance_label = tk.Label(self.control_frame, text='Dist: 0m', bg='#1a1a1a', fg='#00FF00', font=('Courier', 9, 'bold'))
        self.distance_label.pack(side=tk.LEFT, padx=5)
        
        self.angle_label = tk.Label(self.control_frame, text='📐 Angle: 45°', bg='#1a1a1a', fg='#FFFF00', font=('Courier', 9, 'bold'))
        self.angle_label.pack(side=tk.LEFT, padx=5)
        
        self.power_label = tk.Label(self.control_frame, text='💥 Power: 50', bg='#1a1a1a', fg='#FF6600', font=('Courier', 9, 'bold'))
        self.power_label.pack(side=tk.LEFT, padx=5)
        
        self.accuracy_label = tk.Label(self.control_frame, text='✓ Accuracy: 0%', bg='#1a1a1a', fg='#00FF00', font=('Courier', 9, 'bold'))
        self.accuracy_label.pack(side=tk.LEFT, padx=5)
        
        # Reset button
        reset_btn = tk.Button(self.control_frame, text='Reset', command=self.reset_positions, 
                             bg='#00FF00', fg='#000000', font=('Courier', 9, 'bold'), padx=10)
        reset_btn.pack(side=tk.RIGHT, padx=10, pady=5)
        
        # Bind control updates
        self.wind_var.trace('w', self.on_control_change)
        self.wind_dir_var.trace('w', self.on_control_change)
        self.gravity_var.trace('w', self.on_control_change)
    
    def on_control_change(self, *args):
        """Update physics when controls change"""
        self.physics.wind_speed = self.wind_var.get()
        self.physics.wind_direction = self.wind_dir_var.get()
        self.physics.gravity = self.gravity_var.get()
        
        self.wind_label.config(text=f"{self.physics.wind_speed:.0f}")
        self.wind_dir_label.config(text=f"{self.physics.wind_direction:.0f}°")
        self.gravity_label.config(text=f"{self.physics.gravity:.1f}")
    
    def on_mouse_down(self, event):
        """Handle mouse down"""
        if self.player_tank.contains_point(event.x, event.y):
            self.player_tank.dragging = True
            self.player_tank.drag_offset = Vector2(event.x - self.player_tank.pos.x, 
                                                   event.y - self.player_tank.pos.y)
        elif self.enemy_tank.contains_point(event.x, event.y):
            self.enemy_tank.dragging = True
            self.enemy_tank.drag_offset = Vector2(event.x - self.enemy_tank.pos.x, 
                                                  event.y - self.enemy_tank.pos.y)
    
    def on_mouse_move(self, event):
        """Handle mouse move"""
        if self.player_tank.dragging:
            self.player_tank.pos.x = max(0, min(self.canvas.winfo_width(), 
                                                 event.x - self.player_tank.drag_offset.x))
            self.player_tank.pos.y = max(0, min(self.canvas.winfo_height(), 
                                                 event.y - self.player_tank.drag_offset.y))
        elif self.enemy_tank.dragging:
            self.enemy_tank.pos.x = max(0, min(self.canvas.winfo_width(), 
                                               event.x - self.enemy_tank.drag_offset.x))
            self.enemy_tank.pos.y = max(0, min(self.canvas.winfo_height(), 
                                               event.y - self.enemy_tank.drag_offset.y))
    
    def on_mouse_up(self, event):
        """Handle mouse up"""
        self.player_tank.dragging = False
        self.enemy_tank.dragging = False
    
    def reset_positions(self):
        """Reset tank positions"""
        self.player_tank.pos = Vector2(200, 600)
        self.enemy_tank.pos = Vector2(self.canvas.winfo_width() - 200, 600)
    
    def update_loop(self):
        """Main update loop"""
        self.canvas.delete('all')
        
        # Calculate optimal angle and power
        self.current_angle, self.current_power = self.physics.calculate_optimal_trajectory(
            self.player_tank.pos, self.enemy_tank.pos)
        
        # Calculate trajectory with calculated power
        self.trajectory = self.physics.calculate_trajectory(self.player_tank.pos, self.current_angle, self.current_power)
        
        # Calculate stats
        self.stats = self.physics.calculate_stats(self.player_tank.pos, self.enemy_tank.pos, 
                                                 self.trajectory, self.current_angle, self.current_power)
        
        # Draw trajectory
        if len(self.trajectory) > 1:
            points = [(int(p.x), int(p.y)) for p in self.trajectory]
            self.canvas.create_line(points, fill='#FFFF00', width=2, dash=(5, 5))
            
            # Draw impact point
            last_point = self.trajectory[-1]
            self.canvas.create_oval(last_point.x - 20, last_point.y - 20, 
                                   last_point.x + 20, last_point.y + 20, 
                                   outline='#FF0000', width=2)
            self.canvas.create_line(last_point.x - 15, last_point.y, 
                                   last_point.x + 15, last_point.y, fill='#FF0000')
            self.canvas.create_line(last_point.x, last_point.y - 15, 
                                   last_point.x, last_point.y + 15, fill='#FF0000')
        
        # Draw distance line
        self.canvas.create_line(self.player_tank.pos.x, self.player_tank.pos.y,
                               self.enemy_tank.pos.x, self.enemy_tank.pos.y,
                               fill='#00FF00', width=1, dash=(3, 3))
        
        # Draw tanks
        self.player_tank.draw(self.canvas)
        self.enemy_tank.draw(self.canvas)
        
        # Draw cannon line
        angle_rad = (self.current_angle * math.pi) / 180
        cannon_length = 30
        cannon_end_x = self.player_tank.pos.x + cannon_length * math.cos(angle_rad)
        cannon_end_y = self.player_tank.pos.y - cannon_length * math.sin(angle_rad)
        self.canvas.create_line(self.player_tank.pos.x, self.player_tank.pos.y,
                               cannon_end_x, cannon_end_y, fill='#00FF00', width=3)
        
        # Update info labels
        self.distance_label.config(text=f"Dist: {self.stats.get('distance', 0)}m")
        self.angle_label.config(text=f"📐 Angle: {self.stats.get('angle', 0)}°")
        self.power_label.config(text=f"💥 Power: {self.stats.get('power', 0)}")
        self.accuracy_label.config(text=f"✓ Accuracy: {self.stats.get('accuracy', 0):.0f}%")
        
        # Schedule next update
        self.root.after(16, self.update_loop)  # ~60 FPS


def main():
    """Main entry point"""
    root = tk.Tk()
    app = AimTracerOverlay(root)
    root.mainloop()


if __name__ == '__main__':
    main()
