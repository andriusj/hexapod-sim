import numpy as np
import sys
import os

sys.path.append(r'c:\work\hexapod\backend-sim')
from kinematics import HexapodKinematics

k = HexapodKinematics()
x = -150
y = -150
z = 250
roll = np.radians(-30)
pitch = np.radians(-30)
yaw = np.radians(-30)

platform_spacing = 19
base_diameter = 900
platform_diameter = 600
platform_weight = 200
actuator_fixed_length = 280
actuator_working_distance = 220
cg_z = 0

k.base_radius = base_diameter / 2
k.platform_radius = platform_diameter / 2
k.update_geometry(platform_spacing)
k.min_length = actuator_fixed_length
k.max_length = actuator_fixed_length + actuator_working_distance

res = k.calculate_inverse_kinematics(x, y, z, roll, pitch, yaw, platform_weight=200, cg_z=0)
print(res)
