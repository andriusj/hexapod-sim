import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('rendererCanvas', { static: true })
  public rendererCanvas!: ElementRef<HTMLCanvasElement>;

  @ViewChild('canvasContainer', { static: true })
  public canvasContainer!: ElementRef<HTMLDivElement>;

  public params = {
    x: 0,
    y: 0,
    z: 1000,
    roll: 0,
    pitch: 0,
    yaw: 0,
    platform_spacing: 80,
    base_diameter: 1000,
    platform_diameter: 800,
    platform_weight: 200,
    cg_z: 300,
    actuator_fixed_length: 750,
    actuator_working_distance: 500
  };

  public actuatorLengths: number[] = [350, 350, 350, 350, 350, 350];
  public actuatorForces: number[] = [0, 0, 0, 0, 0, 0];
  public isOutOfBounds: boolean = false;
  public outOfBoundsActuators: boolean[] = [false, false, false, false, false, false];

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private animationId: number | null = null;
  
  private platform!: THREE.Mesh;
  private base!: THREE.Mesh;
  private actuatorBodies: THREE.Mesh[] = [];
  private actuatorShafts: THREE.Mesh[] = [];
  
  private baseJoints: THREE.Vector3[] = [];
  private platformJoints: THREE.Vector3[] = [];
  
  private baseJointSpheres: THREE.Mesh[] = [];
  private platformJointSpheres: THREE.Mesh[] = [];

  constructor(private http: HttpClient) {}

  ngAfterViewInit(): void {
    this.initThreeJs();
    this.createHexapodGeometry();
    this.animate();
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Initial fetch
    this.updateKinematics();
  }

  ngOnDestroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }

  public updateKinematics(): void {
    this.updateGeometryPositions();
    const url = `http://localhost:8000/kinematics/inverse?x=${this.params.x}&y=${this.params.y}&z=${this.params.z}&roll=${this.params.roll * Math.PI / 180}&pitch=${this.params.pitch * Math.PI / 180}&yaw=${this.params.yaw * Math.PI / 180}&platform_spacing=${this.params.platform_spacing}&base_diameter=${this.params.base_diameter}&platform_diameter=${this.params.platform_diameter}&platform_weight=${this.params.platform_weight}&cg_z=${this.params.cg_z}&actuator_fixed_length=${this.params.actuator_fixed_length}&actuator_working_distance=${this.params.actuator_working_distance}`;
    
    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.actuatorLengths = res.actuator_lengths;
        if (res.forces_newtons) {
           this.actuatorForces = res.forces_newtons;
        }
        this.isOutOfBounds = !!res.is_out_of_bounds;
        if (res.out_of_bounds_actuators) {
           this.outOfBoundsActuators = res.out_of_bounds_actuators;
        }
        this.updatePlatformPose();
      },
      error: (err) => console.error(err)
    });
  }

  private initThreeJs(): void {
    const canvas = this.rendererCanvas.nativeElement;
    const container = this.canvasContainer.nativeElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 10000);
    this.camera.position.set(1500, 1500, 1500);
    this.camera.lookAt(0, 500, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 500, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(500, 1000, 500);
    this.scene.add(dirLight);
    
    const gridHelper = new THREE.GridHelper(2000, 20, 0x444444, 0x222222);
    this.scene.add(gridHelper);
  }

  private updateGeometryPositions(): void {
    this.baseJoints = [];
    this.platformJoints = [];
    
    const baseRadius = this.params.base_diameter / 2;
    const platformRadius = this.params.platform_diameter / 2;
    const baseSpacing = 20;
    const platformSpacing = this.params.platform_spacing;
    const centers = [0, 120, 240];
    
    const deg2rad = Math.PI / 180;
    
    for (const c of centers) {
      const b1 = (c - baseSpacing/2) * deg2rad;
      const b2 = (c + baseSpacing/2) * deg2rad;
      this.baseJoints.push(new THREE.Vector3(baseRadius * Math.cos(b1), 0, baseRadius * Math.sin(b1)));
      this.baseJoints.push(new THREE.Vector3(baseRadius * Math.cos(b2), 0, baseRadius * Math.sin(b2)));
      
      const p1 = (c - 60 + platformSpacing/2) * deg2rad;
      const p2 = (c + 60 - platformSpacing/2) * deg2rad;
      this.platformJoints.push(new THREE.Vector3(platformRadius * Math.cos(p1), 0, platformRadius * Math.sin(p1)));
      this.platformJoints.push(new THREE.Vector3(platformRadius * Math.cos(p2), 0, platformRadius * Math.sin(p2)));
    }
  }

  private createHexapodGeometry(): void {
    this.updateGeometryPositions();

    const baseRadius = this.params.base_diameter / 2;
    const baseGeometry = new THREE.CylinderGeometry(baseRadius, baseRadius, 20, 32);
    const baseMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
    this.base = new THREE.Mesh(baseGeometry, baseMaterial);
    this.base.position.y = -10;
    this.scene.add(this.base);

    const platformRadius = this.params.platform_diameter / 2;
    const platformGeometry = new THREE.CylinderGeometry(platformRadius, platformRadius, 15, 32);
    const platformMaterial = new THREE.MeshPhongMaterial({ color: 0x007bff });
    this.platform = new THREE.Mesh(platformGeometry, platformMaterial);
    this.scene.add(this.platform);
    
    // Add a sports chair bolted to the top of the platform
    const chair = this.createSportsChair();
    chair.position.y = 15 / 2; // sits right on top of the platform
    this.platform.add(chair);
    
    const bodyGeo = new THREE.CylinderGeometry(20, 20, 1, 16);
    bodyGeo.translate(0, 0.5, 0); // Origin at bottom
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x555555 }); // Darker for body

    const shaftGeo = new THREE.CylinderGeometry(10, 10, 1, 16);
    shaftGeo.translate(0, 0.5, 0); // Origin at bottom
    const shaftMat = new THREE.MeshPhongMaterial({ color: 0xcccccc }); // Lighter for shaft
    
    for (let i = 0; i < 6; i++) {
      const bodyMatClone = bodyMat.clone();
      const body = new THREE.Mesh(bodyGeo, bodyMatClone);
      this.scene.add(body);
      this.actuatorBodies.push(body);

      const shaftMatClone = shaftMat.clone();
      const shaft = new THREE.Mesh(shaftGeo, shaftMatClone);
      this.scene.add(shaft);
      this.actuatorShafts.push(shaft);
      
      // Visualize joints
      const jointGeo = new THREE.SphereGeometry(25, 16, 16);
      const jointMatBase = new THREE.MeshPhongMaterial({color: 0xff0000});
      const jointMatPlat = new THREE.MeshPhongMaterial({color: 0x00ff00});
      
      const bSphere = new THREE.Mesh(jointGeo, jointMatBase);
      bSphere.position.copy(this.baseJoints[i]);
      this.scene.add(bSphere);
      this.baseJointSpheres.push(bSphere);
      
      const pSphere = new THREE.Mesh(jointGeo, jointMatPlat);
      pSphere.position.copy(this.platformJoints[i]);
      this.platform.add(pSphere);
      this.platformJointSpheres.push(pSphere);
      
      // Add text label
      const label = this.createTextSprite((i + 1).toString());
      label.position.set(0, 80, 0); // hover above the base joint
      bSphere.add(label);
    }
  }

  private createTextSprite(message: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
      context.font = 'Bold 60px Arial';
      context.fillStyle = 'white';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.strokeStyle = 'black';
      context.lineWidth = 4;
      context.strokeText(message, 64, 64);
      context.fillText(message, 64, 64);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(100, 100, 1);
    
    return sprite;
  }

  private createSportsChair(): THREE.Group {
    const chairGroup = new THREE.Group();

    const redMat = new THREE.MeshPhongMaterial({ color: 0xcc0000 });
    const blackMat = new THREE.MeshPhongMaterial({ color: 0x111111 });

    // Base bracket (bolted to platform)
    const bracketGeo = new THREE.BoxGeometry(350, 50, 400);
    const bracket = new THREE.Mesh(bracketGeo, blackMat);
    bracket.position.y = 25; 
    chairGroup.add(bracket);

    // Seat cushion
    const seatGeo = new THREE.BoxGeometry(350, 80, 450);
    const seat = new THREE.Mesh(seatGeo, redMat);
    seat.position.set(0, 90, 0);
    chairGroup.add(seat);

    // Backrest group to pivot easily from the base
    const backGroup = new THREE.Group();
    backGroup.position.set(0, 90, -180);
    backGroup.rotation.x = -0.15; // ~8.5 degrees backwards tilt
    chairGroup.add(backGroup);

    // Backrest central cushion
    const backGeo = new THREE.BoxGeometry(350, 750, 80);
    const backrest = new THREE.Mesh(backGeo, redMat);
    backrest.position.set(0, 375, 0); 
    backGroup.add(backrest);

    // Side bolsters (Seat)
    const bolsterGeo = new THREE.BoxGeometry(100, 140, 450);
    const leftBolster = new THREE.Mesh(bolsterGeo, blackMat);
    leftBolster.position.set(-225, 120, 0);
    chairGroup.add(leftBolster);

    const rightBolster = new THREE.Mesh(bolsterGeo, blackMat);
    rightBolster.position.set(225, 120, 0);
    chairGroup.add(rightBolster);

    // Side bolsters (Back)
    const backBolsterGeo = new THREE.BoxGeometry(100, 700, 120);
    const leftBackBolster = new THREE.Mesh(backBolsterGeo, blackMat);
    leftBackBolster.position.set(-210, 380, 20); // Relative to backGroup
    leftBackBolster.rotation.y = 0.2; // Angle inward
    backGroup.add(leftBackBolster);

    const rightBackBolster = new THREE.Mesh(backBolsterGeo, blackMat);
    rightBackBolster.position.set(210, 380, 20);
    rightBackBolster.rotation.y = -0.2;
    backGroup.add(rightBackBolster);

    // Headrest
    const headrestGeo = new THREE.BoxGeometry(250, 150, 100);
    const headrest = new THREE.Mesh(headrestGeo, blackMat);
    headrest.position.set(0, 800, 10);
    backGroup.add(headrest);

    return chairGroup;
  }

  private updatePlatformPose(): void {
    // Map backend coordinates (Z is up) to Three.js (Y is up)
    // Translation: x -> x, y -> z, z -> y
    this.platform.position.set(this.params.x, this.params.z, this.params.y);
    
    // Euler rotation: we must apply the rotations in the correct order.
    // Backend uses Rx(roll) * Ry(pitch) * Rz(yaw)
    // But since Z is up in backend and Y is up in Three, we map:
    // Roll (around backend X) -> Roll (around Three X)
    // Pitch (around backend Y) -> Roll/Pitch (around Three Z)
    // Yaw (around backend Z) -> Yaw (around Three Y)
    
    const rollRad = this.params.roll * Math.PI / 180;
    const pitchRad = this.params.pitch * Math.PI / 180;
    const yawRad = this.params.yaw * Math.PI / 180;

    // Apply rotation
    this.platform.rotation.set(0, 0, 0);
    this.platform.rotateY(-yawRad);
    this.platform.rotateZ(-pitchRad);
    this.platform.rotateX(rollRad);

    this.platform.updateMatrixWorld();

    // Update geometry radii
    if (this.base && this.base.geometry) {
      this.base.geometry.dispose();
      this.base.geometry = new THREE.CylinderGeometry(this.params.base_diameter / 2, this.params.base_diameter / 2, 20, 32);
    }
    if (this.platform && this.platform.geometry) {
      this.platform.geometry.dispose();
      this.platform.geometry = new THREE.CylinderGeometry(this.params.platform_diameter / 2, this.params.platform_diameter / 2, 15, 32);
    }

    // Update actuators
    for (let i = 0; i < 6; i++) {
      if (this.platformJointSpheres && this.platformJointSpheres[i]) {
        this.platformJointSpheres[i].position.copy(this.platformJoints[i]);
      }
      if (this.baseJointSpheres && this.baseJointSpheres[i]) {
        this.baseJointSpheres[i].position.copy(this.baseJoints[i]);
      }

      const baseJ = this.baseJoints[i];
      // Get platform joint world position
      const platJ = this.platformJoints[i].clone();
      platJ.applyMatrix4(this.platform.matrixWorld);
      
      this.actuatorBodies[i].position.copy(baseJ);
      this.actuatorShafts[i].position.copy(baseJ);
      // Point actuator at the platform joint
      const up = new THREE.Vector3(0, 1, 0);
      const dir = new THREE.Vector3().subVectors(platJ, baseJ).normalize();
      this.actuatorBodies[i].quaternion.setFromUnitVectors(up, dir);
      this.actuatorShafts[i].quaternion.setFromUnitVectors(up, dir);
      
      // Set length
      const length = baseJ.distanceTo(platJ);
      // Body length is fixed (e.g. 200mm, mapping to min_length from backend)
      this.actuatorBodies[i].scale.set(1, this.params.actuator_fixed_length, 1);
      // Shaft covers the full length from base to platform
      this.actuatorShafts[i].scale.set(1, length, 1);
      
      // Update color based on out of bounds
      const bodyMat = this.actuatorBodies[i].material as THREE.MeshPhongMaterial;
      const shaftMat = this.actuatorShafts[i].material as THREE.MeshPhongMaterial;
      if (this.outOfBoundsActuators[i]) {
          bodyMat.color.setHex(0x880000);
          shaftMat.color.setHex(0xffcccc);
      } else {
          bodyMat.color.setHex(0x555555);
          shaftMat.color.setHex(0xcccccc);
      }
    }
  }

  private onWindowResize(): void {
    const container = this.canvasContainer.nativeElement;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    if (this.controls) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
