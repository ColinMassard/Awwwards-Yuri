import * as THREE from 'three'
import imagesLoaded from 'imagesloaded'
import GSAP from 'gsap'
import FontFaceObserver from 'fontfaceobserver'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Scroll from './scroll';


import fragment from './shaders/mesh-fragment.glsl'
import noise from './shaders/mesh-noise.glsl'
import vertex from './shaders/mesh-vertex.glsl'

import ocean from '../img/ocean.jpg'

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';


export default class Sketch{
  constructor (options) {
    this.time = 0
    this.container = options.dom
    this.scene = new THREE.Scene()

    this.height = this.container.offsetHeight
    this.width = this.container.offsetWidth

    this.camera = new THREE.PerspectiveCamera( 70, this.width / this.height, 100, 2000 )
    this.camera.position.z = 600

    this.camera.fov =  2 * Math.atan(this.height / 2 / 600) * (180 / Math.PI)

    this.renderer = new THREE.WebGLRenderer( { 
      antialias: true,
      alpha: true 
    })

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))

    this.container.appendChild( this.renderer.domElement )

    this.controls = new OrbitControls( this.camera, this.renderer.domElement )

    this.images = [...document.querySelectorAll('img')]

    const fontOpen = new Promise(resolve => {
      new FontFaceObserver("Open Sans").load().then(() => {
        resolve();
      });
    });

    const fontPlayfair = new Promise(resolve => {
      new FontFaceObserver("Playfair Display").load().then(() => {
        resolve();
      });
    });

    // Preload images
    const preloadImages = new Promise((resolve, reject) => {
        imagesLoaded(document.querySelectorAll("img"), { background: true }, resolve);
    });

    let allDone = [fontOpen, fontPlayfair, preloadImages]

    this.previousScroll = 0
    this.currentScroll = 0
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()

    Promise.all(allDone).then(()=>{
      this.scroll = new Scroll()
      this.addImages()
      this.setPosition()

      this.mouseMovement()
      this.resize()
      this.setupResize()
      // this.addObjects()
      this.composerPass()
      this.render()

      // window.addEventListener('scroll',()=>{
      //     this.currentScroll = window.scrollY;
      //     this.setPosition();
      // })
  })
  }

  composerPass(){
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    //custom shader pass
    var counter = 0.0;
    this.myEffect = {
      uniforms: {
        "tDiffuse": { value: null },
        "scrollSpeed": { value: null },
        "time": { value: null },
      },
      vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix 
          * modelViewMatrix 
          * vec4( position, 1.0 );
      }
      `,
      fragmentShader: `
      uniform sampler2D tDiffuse;
      varying vec2 vUv;
      uniform float scrollSpeed;
      uniform float time;
      ${noise}
      void main(){
        vec2 newUV = vUv;
        float area = smoothstep(1.,0.8,vUv.y)*2. - 1.;
        // area = pow(area,4.);
        float noise = 0.5*(cnoise(vec3(vUv*10.,time/5.)) + 1.);
        float n = smoothstep(0.5,0.51,noise + area);
        newUV.x -= (vUv.x - 0.5)*0.1*area*scrollSpeed;
        gl_FragColor = texture2D( tDiffuse, newUV);
        // gl_FragColor = vec4(n,0.,0.,1.);
        gl_FragColor = mix(vec4(1.), texture2D( tDiffuse, newUV), n);
      }
      `
    }

    this.customPass = new ShaderPass(this.myEffect);
    this.customPass.renderToScreen = true;

    this.composer.addPass(this.customPass);
  }
  
  mouseMovement () {
    window.addEventListener('mousemove', (event)=> {
      this.pointer.x = ( event.clientX / this.width ) * 2 - 1;
      this.pointer.y = - ( event.clientY / this.width ) * 2 + 1;

      // update the picking ray with the camera and pointer position
      this.raycaster.setFromCamera( this.pointer, this.camera );

      // calculate objects intersecting the picking ray
      const intersects = this.raycaster.intersectObjects( this.scene.children );

      if(intersects.length>0) {
        // console.log(intersects[0])
        let obj = intersects[0].object
        obj.material.uniforms.hover.value = intersects[0].uv
      }
    }, false)
  }


  setupResize () {
    window.addEventListener('resize', this.resize.bind(this))
  }

  resize () {
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.renderer.setSize( this.width, this.height )
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()
  }

  addObjects () {
    this.geometry = new THREE.PlaneBufferGeometry(this.width, this.height, 100, 100)
    // this.geometry = new THREE.SphereGeometry(0.4, 40, 40)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: {value: 0},
        oceanTexture: {value: new THREE.TextureLoader().load(ocean)}
      },
      side: THREE.DoubleSide,
      fragmentShader: fragment,
      vertexShader: vertex,
      wireframe: true
    })

    this.mesh = new THREE.Mesh( this.geometry, this.material )
    this.scene.add( this.mesh )
  }

  setPosition () {
    this.imageStore.forEach(o=>{
      o.mesh.position.y = this.currentScroll -o.top + this.height/2 - o.height/2
      o.mesh.position.x = o.left - this.width/2 + o.width/2
    })
  }

  addImages () {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: {value: 0},
        uImage: {value: 0},
        hover: {value: new THREE.Vector2(0.5, 0.5)},
        hoverState: {value: 0},
        oceanTexture: {value: new THREE.TextureLoader().load(ocean)}
      },
      side: THREE.DoubleSide,
      fragmentShader: fragment,
      vertexShader: vertex,
      // wireframe: true
    })

    this.materials = []

    this.imageStore = this.images.map(img => {
      let bounds = img.getBoundingClientRect()

      let geometry = new THREE.PlaneGeometry(bounds.width, bounds.height, 10, 10);

      // let texture = new THREE.Texture(img)
      // TO DO: Not to use deprecated down Us the following code instead

      let image = new Image()
      image.src = img.src
      let texture = new THREE.Texture(image)

      texture.needsUpdate = true

      // let material = new THREE.MeshBasicMaterial({
      //   map: texture
      // })

      let material = this.material.clone()

      img.addEventListener('mouseenter', () =>{
        GSAP.to(material.uniforms.hoverState, {
          duration: 1,
          value: 1,
          ease: "power3.out"
        })
      })

      img.addEventListener('mouseout', () =>{
        GSAP.to(material.uniforms.hoverState, {
          duration: 1,
          value: 0,
          ease: "power3.out"
        })
      })

      this.materials.push(material)

      material.uniforms.uImage.value = texture;

      let mesh = new THREE.Mesh(geometry, material)

      this.scene.add(mesh)


      return {
        img: img,
        mesh: mesh,
        top: bounds.top,
        left: bounds.left,
        width: bounds.width,
        height: bounds.height
      }
    }) 
  }

  render(){
    this.time+=0.05;
    
    this.scroll.render();
    this.previousScroll = this.currentScroll

    this.currentScroll = this.scroll.scrollToRender;
    


    // if(Math.round(this.currentScroll)!==Math.round(this.previousScroll)){
        // console.log('should render');
        this.setPosition();
        this.customPass.uniforms.scrollSpeed.value = this.scroll.speedTarget;
        this.customPass.uniforms.time.value = this.time;

        // this.material.uniforms.time.value = this.time;

        this.materials.forEach(m=>{
            m.uniforms.time.value = this.time;
        })

        // this.renderer.render( this.scene, this.camera );
        this.composer.render()
    // }

    
    window.requestAnimationFrame(this.render.bind(this));
  }
}

new Sketch({
  dom: document.getElementById('container') 
})

