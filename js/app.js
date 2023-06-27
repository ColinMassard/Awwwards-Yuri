import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import fragment from './shaders/mesh-fragment.glsl'
import vertex from './shaders/mesh-vertex.glsl'

import ocean from '../img/ocean.jpg'

export default class Sketch{
  constructor (options) {
    this.container = options.dom

    this.height = this.container.offsetHeight
    this.width = this.container.offsetWidth

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera( 70, this.width / this.height, 100, 2000 )
    
    this.time = 0
    
    this.camera.position.z = 600

    this.camera.fov =  2 * Math.atan(this.height / 2 / 600) * (180 / Math.PI)

    this.renderer = new THREE.WebGLRenderer( { 
      antialias: true,
      alpha: true 
    })

    this.container.appendChild( this.renderer.domElement )

    this.controls = new OrbitControls( this.camera, this.renderer.domElement )

    this.resize()
    this.setupResize()
    this.addObjects()
    this.render()
  }

  setupResize () {
    window.addEventListener('resize', this.resize.bind(this))
  }

  resize () {
    this.height = this.container.offsetHeight
    this.width = this.container.offsetWidth

    this.renderer.setSize( this.width, this.height )
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix();
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

  render () {
    this.time+=0.05
    this.mesh.rotation.x = this.time / 2000;
    this.mesh.rotation.y = this.time / 1000;
  
    this.material.uniforms.time.value = this.time

    this.renderer.render( this.scene, this.camera )

    window.requestAnimationFrame(this.render.bind(this))
  }
}

new Sketch({
  dom: document.getElementById('container') 
})

