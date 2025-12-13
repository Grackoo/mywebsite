
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function init3DHero(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0a, 0.05); // Dark fog for depth

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00BFFF, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x7FFF00, 0.5);
    pointLight2.position.set(-5, 2, -5);
    scene.add(pointLight2);

    // --- PROCEDURAL LAPTOP MODEL ---
    const laptopGroup = new THREE.Group();
    scene.add(laptopGroup);

    // Materials
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, metalness: 0.8 }); // ThinkPad Black
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const displayMat = new THREE.MeshBasicMaterial({ color: 0x00BFFF, transparent: true, opacity: 0.8 }); // Glowing Screen
    const pcbMat = new THREE.MeshStandardMaterial({ color: 0x006600, roughness: 0.8 });
    const batteryMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 1.0, roughness: 0.2 });
    const redAccentMat = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // TrackPoint

    // 1. Bottom Chassis
    const bottomGeo = new THREE.BoxGeometry(3.2, 0.1, 2.2);
    const bottomChassis = new THREE.Mesh(bottomGeo, chassisMat);
    bottomChassis.userData = { originalY: 0, explodeY: -0.5 };
    laptopGroup.add(bottomChassis);

    // 2. Internals (Motherboard, Battery, Fan)
    const internalsGroup = new THREE.Group();
    laptopGroup.add(internalsGroup);
    internalsGroup.userData = { originalY: 0.1, explodeY: 0 };

    // Motherboard
    const mbGeo = new THREE.BoxGeometry(3, 0.05, 1.5);
    const mb = new THREE.Mesh(mbGeo, pcbMat);
    mb.position.set(0, 0, -0.2);
    internalsGroup.add(mb);

    // Battery
    const batGeo = new THREE.BoxGeometry(2.8, 0.05, 0.5);
    const bat = new THREE.Mesh(batGeo, batteryMat);
    bat.position.set(0, 0, 0.7);
    internalsGroup.add(bat);

    // Fan/Heatsink
    const fanGeo = new THREE.BoxGeometry(0.5, 0.05, 0.5);
    const fan = new THREE.Mesh(fanGeo, silverMat);
    fan.position.set(1, 0.05, -0.5);
    internalsGroup.add(fan);

    // 3. Simple Keyboard / Top Case
    const topCaseGeo = new THREE.BoxGeometry(3.2, 0.05, 2.2);
    const topCase = new THREE.Mesh(topCaseGeo, chassisMat);
    topCase.userData = { originalY: 0.2, explodeY: 0.5 };
    laptopGroup.add(topCase);

    // TrackPoint
    const trackPointGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.02, 8);
    const trackPoint = new THREE.Mesh(trackPointGeo, redAccentMat);
    trackPoint.position.set(0, 0.03, 0.1);
    topCase.add(trackPoint);

    // 4.  Screen Hinge (Pivot)
    const screenGroup = new THREE.Group();
    // Pivot point at the back
    screenGroup.position.set(0, 0.2, -1.1);
    // Initial rotation (open state)
    screenGroup.rotation.x = 0.5;
    screenGroup.userData = { originalY: 0.2, explodeY: 1.0, isScreen: true };
    laptopGroup.add(screenGroup);

    // Screen Lid
    const lidGeo = new THREE.BoxGeometry(3.2, 0.1, 2.2);
    // Move geometry so origin is at the hinge
    lidGeo.translate(0, 0.05, -1.1); // Actually translate geometry to align with hinge logic if needed, but easier to just position children

    // Actually, let's just make the screen relative to the hinge group
    const lid = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 2.2), chassisMat);
    lid.position.set(0, 0.5, 0.8); // Adjusted to look open
    lid.rotation.x = -1.5; // Almost 90 degrees open relative to flat
    screenGroup.add(lid);

    // Display Panel (Inner)
    const display = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.01, 2.0), displayMat);
    display.position.set(0, 0.49, 0.8); // Slightly "in front" of lid
    display.rotation.x = -1.5;
    screenGroup.add(display);


    // --- ANIMATION / INTERACTION ---
    let targetExplosion = 0; // 0 to 1

    container.addEventListener('mousemove', (e) => {
        // Calculate normalized mouse position in container
        const rect = container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        // Interactive Rotation
        const rotX = (y - 0.5) * 1; // -0.5 to 0.5
        const rotY = (x - 0.5) * 2; // -1 to 1

        laptopGroup.rotation.x = THREE.MathUtils.lerp(laptopGroup.rotation.x, 0.2 + rotX * 0.2, 0.1);
        laptopGroup.rotation.y = THREE.MathUtils.lerp(laptopGroup.rotation.y, rotY * 0.5, 0.1);

        // Explode on hover center area or general proximity?
        // Let's just explode based on vertical mouse position being "high" or just proximity to center
        // Or actually, just make it explode when hovering the element itself
        targetExplosion = 1;
    });

    container.addEventListener('mouseleave', () => {
        targetExplosion = 0;
    });

    // Animation Loop
    let currentExplosion = 0;

    function animate() {
        requestAnimationFrame(animate);

        // Smoothly interpolate explosion factor
        currentExplosion = THREE.MathUtils.lerp(currentExplosion, targetExplosion, 0.05);

        // Apply positions
        laptopGroup.children.forEach(child => {
            if (child.userData.explodeY !== undefined) {
                const targetY = THREE.MathUtils.lerp(child.userData.originalY, child.userData.explodeY, currentExplosion);

                // If it's the screen, we might also want to "detach" it or just move it up
                if (child.userData.isScreen) {
                    child.position.y = targetY;
                } else {
                    child.position.y = targetY;
                }
            }
        });

        // Rotate laptop slowly if idle
        if (targetExplosion === 0) {
            laptopGroup.rotation.y += 0.002;
        }

        renderer.render(scene, camera);
    }

    animate();

    // Handle Resize
    window.addEventListener('resize', () => {
        if (!container.clientWidth) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}
