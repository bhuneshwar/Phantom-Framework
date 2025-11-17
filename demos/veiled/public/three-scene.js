/**
 * Three.js Spectral Scene - Shadowy overlays and atmospheric effects
 * Creates eerie visual effects that respond to audio levels and spectral activity
 */

class SpectralScene {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = [];
        this.shadows = [];
        this.audioAnalyzer = null;
        this.hauntLevel = 0;
        this.isInitialized = false;
        
        // Animation properties
        this.animationId = null;
        this.time = 0;
        this.pulseIntensity = 0;
        
        this.init();
    }

    init() {
        try {
            // Create scene
            this.scene = new THREE.Scene();
            this.scene.fog = new THREE.Fog(0x000000, 10, 50);

            // Create camera
            this.camera = new THREE.PerspectiveCamera(
                75, 
                this.container.clientWidth / this.container.clientHeight, 
                0.1, 
                1000
            );
            this.camera.position.z = 20;

            // Create renderer
            this.renderer = new THREE.WebGLRenderer({ 
                alpha: true, 
                antialias: true 
            });
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.renderer.setClearColor(0x000000, 0.1);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            this.container.appendChild(this.renderer.domElement);

            // Create spectral elements
            this.createParticleSystem();
            this.createShadowFigures();
            this.createAmbientLighting();
            this.createSpectralOrbs();

            // Set up event listeners
            this.setupEventListeners();

            // Start animation loop
            this.animate();

            this.isInitialized = true;
            console.log('👻 Spectral scene initialized');
        } catch (error) {
            console.error('Failed to initialize spectral scene:', error);
        }
    }

    createParticleSystem() {
        const particleCount = 200;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random positions in a sphere
            positions[i3] = (Math.random() - 0.5) * 40;
            positions[i3 + 1] = (Math.random() - 0.5) * 40;
            positions[i3 + 2] = (Math.random() - 0.5) * 40;

            // Purple/blue spectral colors
            const hue = 0.7 + Math.random() * 0.2; // Purple to blue range
            const color = new THREE.Color().setHSL(hue, 0.8, 0.3 + Math.random() * 0.4);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;

            sizes[i] = Math.random() * 2 + 0.5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                hauntLevel: { value: 0 },
                pulseIntensity: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                varying float vSize;
                uniform float time;
                uniform float hauntLevel;
                uniform float pulseIntensity;

                void main() {
                    vColor = color;
                    vSize = size;
                    
                    vec3 pos = position;
                    
                    // Floating motion
                    pos.y += sin(time * 0.5 + position.x * 0.1) * 2.0;
                    pos.x += cos(time * 0.3 + position.z * 0.1) * 1.5;
                    
                    // Haunt level affects movement
                    pos += sin(time * 2.0 + position.x * 0.2) * hauntLevel * 3.0;
                    
                    // Pulse effect
                    float pulse = sin(time * 5.0) * pulseIntensity;
                    pos *= (1.0 + pulse * 0.1);
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z) * (1.0 + hauntLevel * 0.5);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vSize;
                uniform float hauntLevel;
                uniform float pulseIntensity;

                void main() {
                    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
                    float alpha = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);
                    
                    // Increase opacity with haunt level
                    alpha *= (0.3 + hauntLevel * 0.7);
                    
                    // Pulse effect
                    alpha *= (1.0 + pulseIntensity * 0.5);
                    
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
    }

    createShadowFigures() {
        const figureCount = 5;
        
        for (let i = 0; i < figureCount; i++) {
            const geometry = new THREE.ConeGeometry(1, 4, 8);
            const material = new THREE.MeshLambertMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.3
            });

            const figure = new THREE.Mesh(geometry, material);
            figure.position.set(
                (Math.random() - 0.5) * 30,
                -5,
                (Math.random() - 0.5) * 30
            );
            figure.castShadow = true;
            figure.receiveShadow = true;

            // Add floating animation
            figure.userData = {
                originalY: figure.position.y,
                floatSpeed: 0.5 + Math.random() * 0.5,
                floatRange: 1 + Math.random() * 2
            };

            this.shadows.push(figure);
            this.scene.add(figure);
        }
    }

    createAmbientLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
        this.scene.add(ambientLight);

        // Directional light for shadows
        const directionalLight = new THREE.DirectionalLight(0x8a2be2, 0.5);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        this.scene.add(directionalLight);

        // Spectral point lights
        const colors = [0x8a2be2, 0x4b0082, 0x9932cc];
        for (let i = 0; i < 3; i++) {
            const light = new THREE.PointLight(colors[i], 0.3, 20);
            light.position.set(
                (Math.random() - 0.5) * 20,
                Math.random() * 10,
                (Math.random() - 0.5) * 20
            );
            
            light.userData = {
                originalIntensity: 0.3,
                flickerSpeed: 1 + Math.random() * 2
            };
            
            this.scene.add(light);
        }
    }

    createSpectralOrbs() {
        const orbCount = 8;
        
        for (let i = 0; i < orbCount; i++) {
            const geometry = new THREE.SphereGeometry(0.5, 16, 16);
            const material = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(0.7 + Math.random() * 0.2, 0.8, 0.5),
                transparent: true,
                opacity: 0.4
            });

            const orb = new THREE.Mesh(geometry, material);
            orb.position.set(
                (Math.random() - 0.5) * 25,
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 25
            );

            // Add orbital motion
            orb.userData = {
                orbitRadius: 5 + Math.random() * 10,
                orbitSpeed: 0.2 + Math.random() * 0.3,
                orbitPhase: Math.random() * Math.PI * 2,
                originalPosition: orb.position.clone()
            };

            this.scene.add(orb);
        }
    }

    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.camera && this.renderer) {
                this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            }
        });

        // Listen for spectral events
        document.addEventListener('spectralEvent', (event) => {
            this.handleSpectralEvent(event.detail);
        });

        document.addEventListener('audioLevel', (event) => {
            this.handleAudioLevel(event.detail.level);
        });

        document.addEventListener('hauntLevel', (event) => {
            this.setHauntLevel(event.detail.level);
        });
    }

    handleSpectralEvent(eventData) {
        // Trigger visual effects based on spectral events
        const { type, intensity = 0.5 } = eventData;
        
        switch (type) {
            case 'ai_haunt':
                this.triggerHauntEffect(intensity);
                break;
            case 'high_emotion':
                this.triggerEmotionEffect(intensity);
                break;
            case 'spectral_anomaly':
                this.triggerAnomalyEffect(intensity);
                break;
            default:
                this.triggerPulseEffect(intensity * 0.5);
        }
    }

    handleAudioLevel(level) {
        // Update pulse intensity based on audio level
        this.pulseIntensity = Math.max(this.pulseIntensity, level);
        
        // Decay pulse intensity
        setTimeout(() => {
            this.pulseIntensity *= 0.9;
        }, 100);
    }

    setHauntLevel(level) {
        this.hauntLevel = Math.max(0, Math.min(1, level));
        
        // Update particle system haunt level
        if (this.particleSystem && this.particleSystem.material.uniforms) {
            this.particleSystem.material.uniforms.hauntLevel.value = this.hauntLevel;
        }
        
        // Update shadow figure opacity
        this.shadows.forEach(shadow => {
            shadow.material.opacity = 0.3 + this.hauntLevel * 0.4;
        });
    }

    triggerHauntEffect(intensity) {
        // Intense particle movement
        this.pulseIntensity = Math.max(this.pulseIntensity, intensity);
        
        // Flicker lights
        this.scene.children.forEach(child => {
            if (child instanceof THREE.PointLight) {
                const originalIntensity = child.userData.originalIntensity || 0.3;
                child.intensity = originalIntensity * (1 + intensity);
                
                setTimeout(() => {
                    child.intensity = originalIntensity;
                }, 500 + Math.random() * 1000);
            }
        });
        
        // Shake camera
        const originalPosition = this.camera.position.clone();
        const shakeIntensity = intensity * 0.5;
        
        const shakeAnimation = () => {
            this.camera.position.x = originalPosition.x + (Math.random() - 0.5) * shakeIntensity;
            this.camera.position.y = originalPosition.y + (Math.random() - 0.5) * shakeIntensity;
            
            setTimeout(() => {
                this.camera.position.copy(originalPosition);
            }, 100);
        };
        
        shakeAnimation();
        setTimeout(shakeAnimation, 200);
    }

    triggerEmotionEffect(intensity) {
        // Change particle colors based on emotion
        const emotionColor = new THREE.Color().setHSL(
            Math.random(), // Random hue for different emotions
            0.8,
            0.3 + intensity * 0.4
        );
        
        // Temporarily tint the scene
        this.scene.fog.color.lerp(emotionColor, 0.3);
        
        setTimeout(() => {
            this.scene.fog.color.lerp(new THREE.Color(0x000000), 0.1);
        }, 2000);
    }

    triggerAnomalyEffect(intensity) {
        // Distort particle positions
        if (this.particleSystem) {
            const positions = this.particleSystem.geometry.attributes.position.array;
            
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += (Math.random() - 0.5) * intensity * 2;
                positions[i + 1] += (Math.random() - 0.5) * intensity * 2;
                positions[i + 2] += (Math.random() - 0.5) * intensity * 2;
            }
            
            this.particleSystem.geometry.attributes.position.needsUpdate = true;
        }
    }

    triggerPulseEffect(intensity) {
        this.pulseIntensity = Math.max(this.pulseIntensity, intensity);
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        this.time += 0.016; // ~60fps
        
        // Update particle system uniforms
        if (this.particleSystem && this.particleSystem.material.uniforms) {
            this.particleSystem.material.uniforms.time.value = this.time;
            this.particleSystem.material.uniforms.pulseIntensity.value = this.pulseIntensity;
        }
        
        // Animate shadow figures
        this.shadows.forEach(shadow => {
            const userData = shadow.userData;
            shadow.position.y = userData.originalY + 
                Math.sin(this.time * userData.floatSpeed) * userData.floatRange;
            
            // Rotate slowly
            shadow.rotation.y += 0.005;
        });
        
        // Animate spectral orbs
        this.scene.children.forEach(child => {
            if (child.userData && child.userData.orbitRadius) {
                const userData = child.userData;
                const angle = this.time * userData.orbitSpeed + userData.orbitPhase;
                
                child.position.x = userData.originalPosition.x + 
                    Math.cos(angle) * userData.orbitRadius;
                child.position.z = userData.originalPosition.z + 
                    Math.sin(angle) * userData.orbitRadius;
                child.position.y = userData.originalPosition.y + 
                    Math.sin(angle * 2) * 2;
            }
        });
        
        // Animate lights
        this.scene.children.forEach(child => {
            if (child instanceof THREE.PointLight && child.userData.flickerSpeed) {
                const userData = child.userData;
                const flicker = Math.sin(this.time * userData.flickerSpeed) * 0.1 + 0.9;
                child.intensity = userData.originalIntensity * flicker * (1 + this.hauntLevel * 0.5);
            }
        });
        
        // Decay pulse intensity
        this.pulseIntensity *= 0.98;
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.renderer) {
            this.renderer.dispose();
            if (this.container && this.renderer.domElement) {
                this.container.removeChild(this.renderer.domElement);
            }
        }
        
        this.isInitialized = false;
    }
}

// Export for use in main application
window.SpectralScene = SpectralScene;