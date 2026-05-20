import numpy as np
import sys

sys.path.append(r'c:\work\hexapod\backend-sim')
from kinematics import HexapodKinematics

k = HexapodKinematics()
x = -150; y = -150; z = 250
roll = np.radians(-30); pitch = np.radians(-30); yaw = np.radians(-30)

platform_spacing = 19
base_diameter = 900
platform_diameter = 600
platform_weight = 200
actuator_fixed_length = 280
actuator_working_distance = 220

k.base_radius = base_diameter / 2
k.platform_radius = platform_diameter / 2
k.update_geometry(platform_spacing)

T = np.array([x, y, z]).reshape(3, 1)
R = k.rotation_matrix(roll, pitch, yaw)
P_base = T + R @ k.P

print("Base joints:")
for i in range(6):
    print(f"{i}: {k.B[:, i]}")

print("\nPlatform joints:")
for i in range(6):
    print(f"{i}: {P_base[:, i]}")

L = P_base - k.B
lengths = np.linalg.norm(L, axis=0)
print("\nUnclipped lengths:")
for i in range(6):
    print(f"{i}: {lengths[i]}")

