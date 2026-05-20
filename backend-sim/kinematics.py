import numpy as np

class HexapodKinematics:
    def __init__(self, base_radius: float = 400.0, platform_radius: float = 300.0, 
                 min_length: float = 200.0, max_length: float = 500.0):
        self.base_radius = base_radius
        self.platform_radius = platform_radius
        self.min_length = min_length
        self.max_length = max_length
        
        self.current_platform_spacing = None
        self.update_geometry(40.0) # default platform spacing

    def update_geometry(self, platform_spacing: float):
        self.current_platform_spacing = platform_spacing
        self.current_platform_spacing = platform_spacing
        
        base_spacing = 20     # spacing within a pair on the base
        centers = [0, 120, 240]
        
        base_angles_deg = []
        platform_angles_deg = []
        
        for c in centers:
            base_angles_deg.append(c - base_spacing/2)
            base_angles_deg.append(c + base_spacing/2)
            # Platform joints are shifted so they form alternating triangles
            platform_angles_deg.append(c - 60 + platform_spacing/2)
            platform_angles_deg.append(c + 60 - platform_spacing/2)
            
        base_angles = np.radians(base_angles_deg)
        platform_angles = np.radians(platform_angles_deg)
        
        self.B = np.zeros((3, 6)) # Base joints
        self.P = np.zeros((3, 6)) # Platform joints
        
        for i in range(6):
            self.B[0, i] = self.base_radius * np.cos(base_angles[i])
            self.B[1, i] = self.base_radius * np.sin(base_angles[i])
            self.B[2, i] = 0.0 
            
            self.P[0, i] = self.platform_radius * np.cos(platform_angles[i])
            self.P[1, i] = self.platform_radius * np.sin(platform_angles[i])
            self.P[2, i] = 0.0 

    def rotation_matrix(self, roll, pitch, yaw):
        """ Calculate rotation matrix from roll, pitch, yaw (in radians) """
        Rx = np.array([
            [1, 0, 0],
            [0, np.cos(roll), -np.sin(roll)],
            [0, np.sin(roll), np.cos(roll)]
        ])
        
        Ry = np.array([
            [np.cos(pitch), 0, np.sin(pitch)],
            [0, 1, 0],
            [-np.sin(pitch), 0, np.cos(pitch)]
        ])
        
        Rz = np.array([
            [np.cos(yaw), -np.sin(yaw), 0],
            [np.sin(yaw), np.cos(yaw), 0],
            [0, 0, 1]
        ])
        
        return Rz @ Ry @ Rx

    def calculate_inverse_kinematics(self, x, y, z, roll, pitch, yaw, platform_weight: float = 200.0, cg_z: float = 0.0):
        """
        Calculate the required lengths of the 6 actuators and the static forces.
        x, y, z: Translation of the platform center relative to the base center
        roll, pitch, yaw: Rotation in radians
        platform_weight: Mass of the platform in kg
        cg_z: Z offset of the center of gravity relative to platform center (in mm)
        Returns a dictionary with lengths and static actuator forces.
        """
        T = np.array([x, y, z]).reshape(3, 1)
        R = self.rotation_matrix(roll, pitch, yaw)
        
        # Platform joint coordinates in the base frame
        r_i = R @ self.P  # Vectors from platform center to platform joints
        P_base = T + r_i
        
        # Actuator vectors
        L = P_base - self.B
        
        # Calculate lengths
        lengths = np.linalg.norm(L, axis=0)
        
        # Unit vectors for each actuator
        U = L / lengths
        
        # Check if any length is out of physical bounds before clamping
        out_of_bounds_flags = (lengths < self.min_length) | (lengths > self.max_length)
        is_out_of_bounds = bool(np.any(out_of_bounds_flags))
        
        # Clamp lengths to hardware constraints
        lengths_clipped = np.clip(lengths, self.min_length, self.max_length)
        
        # Static Force Calculation
        # Platform mass = platform_weight kg, g = 9.81 m/s^2
        M_platform = platform_weight
        g = 9.81
        F_ext = np.array([0, 0, -M_platform * g])
        
        # Center of Gravity offset (e.g. from the heavy chair)
        # Assuming CG is shifted up by cg_z in the platform's local frame
        cg_local = np.array([0, 0, cg_z])
        cg_global = R @ cg_local
        
        # Gravity creates a moment about the platform center if CG is not at the center
        M_ext = np.cross(cg_global, F_ext)
        W = np.concatenate([F_ext, M_ext]) # 6x1 wrench vector
        
        # Build Jacobian transpose (6x6)
        # Column i is [u_i, r_i x u_i]
        JT = np.zeros((6, 6))
        for i in range(6):
            JT[0:3, i] = U[:, i]
            JT[3:6, i] = np.cross(r_i[:, i], U[:, i])
            
        # Solve for actuator forces f: JT * f = -W
        try:
            forces = np.linalg.solve(JT, -W)
        except np.linalg.LinAlgError:
            # Handle singular configuration
            forces = np.zeros(6)
            
        return {
            "lengths": lengths_clipped.tolist(),
            "forces_newtons": forces.tolist(),
            "is_out_of_bounds": is_out_of_bounds,
            "out_of_bounds_actuators": out_of_bounds_flags.tolist()
        }
