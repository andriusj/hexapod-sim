from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from kinematics import HexapodKinematics

app = FastAPI(title="Hexapod Simulator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the kinematics engine
# Using generic dimensions (mm). Actuator travel is 200-500mm.
kinematics_engine = HexapodKinematics(base_radius=400.0, platform_radius=300.0, min_length=200.0, max_length=500.0)

@app.get("/")
def read_root():
    return {"message": "Hexapod Simulator API is running"}

@app.get("/kinematics/inverse")
def get_inverse_kinematics(
    x: float = 0, y: float = 0, z: float = 1000, 
    pitch: float = 0, roll: float = 0, yaw: float = 0, 
    platform_spacing: float = 80.0,
    base_diameter: float = 1000.0,
    platform_diameter: float = 800.0,
    platform_weight: float = 200.0,
    cg_z: float = 300.0,
    actuator_fixed_length: float = 750.0,
    actuator_working_distance: float = 500.0
):
    """
    Returns the required actuator lengths for a given pose and spacing.
    """
    kinematics_engine.base_radius = base_diameter / 2
    kinematics_engine.platform_radius = platform_diameter / 2
    kinematics_engine.update_geometry(platform_spacing)
    kinematics_engine.min_length = actuator_fixed_length
    kinematics_engine.max_length = actuator_fixed_length + actuator_working_distance
    
    lengths_data = kinematics_engine.calculate_inverse_kinematics(x, y, z, roll, pitch, yaw, platform_weight, cg_z)
    return {
        "actuator_lengths": lengths_data["lengths"],
        "forces_newtons": lengths_data["forces_newtons"],
        "is_out_of_bounds": lengths_data.get("is_out_of_bounds", False),
        "out_of_bounds_actuators": lengths_data.get("out_of_bounds_actuators", [False]*6),
        "pose": {
            "x": x, "y": y, "z": z,
            "roll": roll, "pitch": pitch, "yaw": yaw,
            "platform_spacing": platform_spacing,
            "base_diameter": base_diameter,
            "platform_diameter": platform_diameter,
            "platform_weight": platform_weight,
            "cg_z": cg_z,
            "actuator_fixed_length": actuator_fixed_length,
            "actuator_working_distance": actuator_working_distance
        }
    }
