import numpy as np
import sys
import os

sys.path.append(r'c:\work\hexapod\backend-sim')
from kinematics import HexapodKinematics

k = HexapodKinematics(base_radius=450, platform_radius=300)
# From screenshot
x = -150
y = -150
z = 250
roll = np.radians(-30)
pitch = np.radians(-30)
yaw = np.radians(-30)

res = k.calculate_inverse_kinematics(x, y, z, roll, pitch, yaw, platform_weight=200)
print(res)

T = np.array([x, y, z]).reshape(3, 1)
R = k.rotation_matrix(roll, pitch, yaw)
r_i = R @ k.P
P_base = T + r_i
L = P_base - k.B
lengths = np.linalg.norm(L, axis=0)
print("Unclipped lengths:", lengths)

U = L / lengths
JT = np.zeros((6, 6))
for i in range(6):
    JT[0:3, i] = U[:, i]
    JT[3:6, i] = np.cross(r_i[:, i], U[:, i])
    
print("Condition number:", np.linalg.cond(JT))
print("Determinant:", np.linalg.det(JT))
