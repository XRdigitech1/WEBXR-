import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/jsm/OrbitControls.js';
import { GLTFLoader } from '../../libs/three/jsm/GLTFLoader.js';
import { Stats } from '../../libs/stats.module.js';
import { CanvasUI } from '../../libs/CanvasUI.js'
import { ARButton } from '../../libs/ARButton.js';
import { LoadingBar } from '../../libs/LoadingBar.js';
import { Player } from '../../libs/Player.js';
import { ControllerGestures } from '../../libs/ControllerGestures.js';

class App{
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
        
        this.clock = new THREE.Clock();
        
		this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.01, 20 );
		
		this.scene = new THREE.Scene();
        
        this.scene.add(this.camera);
       
		this.scene.add( new THREE.HemisphereLight( 0x606060, 0x404040 ) );

        const light = new THREE.DirectionalLight( 0xffffff );
        light.position.set( 1, 1, 1 ).normalize();
		this.scene.add( light );
			
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        
		container.appendChild( this.renderer.domElement );
        
        this.controls = new OrbitControls( this.camera, this.renderer.domElement );
        this.controls.target.set(0, 3.5, 0);
        this.controls.update();
        
        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);
        
        this.origin = new THREE.Vector3();
        this.euler = new THREE.Euler();
        this.quaternion = new THREE.Quaternion();
        
        this.initScene();
        this.setupXR();
        
        window.addEventListener('resize', this.resize.bind(this) );
	}	
    
    initScene(){
        this.loadingBar = new LoadingBar();
        
        this.assetsPath = '../../assets/';
        const loader = new GLTFLoader().setPath(this.assetsPath);
		const self = this;
		
		// Load a GLTF resource
		loader.load(
			// resource URL
			`table.glb`,
			// called when the resource is loaded
			function ( gltf ) {
				const object = gltf.scene.children[5];
				
				self.tab = gltf.scene;
                self.scene.add(gltf.scene);
                self.tab.object.visible = false;
				
				//self.table.action = 'Dance';
				const scale = 0.003;
				self.tab.object.scale.set(scale, scale, scale); 
				
                self.loadingBar.visible = false;
			},
			// called while loading is progressing
			function ( xhr ) {

				self.loadingBar.progress = (xhr.loaded / xhr.total);

			},
			// called when loading has errors
			function ( error ) {

				console.log( 'An error happened' );

			}
		);
        
        this.createUI();
    }
    
    createUI() {
        
        const config = {
            panelSize: { width: 0.15, height: 0.038 },
            height: 128,
            info:{ type: "text" }
        }
        const content = {
            info: "Debug info"
        }
        
        const ui = new CanvasUI( content, config );
        
        this.ui = ui;
    }
    
    setupXR(){
        this.renderer.xr.enabled = true; 
        
        const self = this;
        let controller, controller1;
        
        function onSessionStart(){
            self.ui.mesh.position.set( 0, -0.15, -0.3 );
            self.camera.add( self.ui.mesh );
        }
        
        function onSessionEnd(){
            self.camera.remove( self.ui.mesh );
        }
        
        const btn = new ARButton( this.renderer, { onSessionStart, onSessionEnd } );
        
        //Add gestures here
        this.gestures = new ControllerGestures(this.renderer);
        this.gestures.addEventListener( 'tap', (ev)=>{
            //console.log( 'tap' ); 
            self.ui.updateElement('info', 'tap' );
            if (!self.tab.object.visible){
                self.tab.object.visible = true;
                self.tab.object.position.set( 0, -0.3, -0.5 ).add( ev.position );
                self.scene.add( self.tab.object ); 
            }
        });

        this.gestures.addEventListener('swipe' , (ev)=> {
            console.log(ev),
            self.ui.updateElement('info', `swipe ${ev.direction}`);
            if(self.tab.object.visible){
                self.tab.object.visible = false;
                self.tab.remove(self.tab.object);

            }
        });
        this.gestures.addEventListener('pan' , (ev) =>{
            console.log(ev);
            if(ev.initialise !== undefined)
            {
                self.startPosition = self.tab.object.position.clone();

            }
            else
            {
                const pos = self.startPosition.clone().add(ev.delta.multiplyScalar(3));
                self.tab.object.position.copy(pos);
                self.ui.updateElement('info' , `pan x:${ev.delta.x.toFixed(3)} y:${ev.delta.y.toFixed(3)} z:${ev.delta.z.toFixed(3)}`);
            }
        });
        this.gestures.addEventListener( 'pinch', (ev)=>{
            //console.log( ev );  
            if (ev.initialise !== undefined){
                self.startScale = self.tab.object.scale.clone();
            }else{
                const scale = self.startScale.clone().multiplyScalar(ev.scale);
                self.tab.object.scale.copy( scale );
                self.ui.updateElement('info', `pinch delta:${ev.delta.toFixed(3)} scale:${ev.scale.toFixed(2)}` );
            }
        });
        this.gestures.addEventListener("rotate" , (ev) =>{
            if(ev.initialise !== undefined){
               self.startQuaternion = self.tab.object.quaternion.clone();
            }
            else
            {
                self.tab.object.quaternion.copy(self.startQuaternion);
                self.tab.object.rotateY(ev.theta);
                self.ui.updateElement("info" , `rotate ${ev.theta.toFixed(3)}`);
            }
            
        })
        
        this.renderer.setAnimationLoop( this.render.bind(this) );
    }
    
    resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );  
    }
    
	render( ) {   
        const dt = this.clock.getDelta();
        this.stats.update();
        if ( this.renderer.xr.isPresenting ){
            this.gestures.update();
            this.ui.update();
        }
        if ( this.tab !== undefined ) this.tab.update(dt);
        this.renderer.render( this.scene, this.camera );
    }
}

export { App };