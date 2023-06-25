import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import fragment from '/shaders/mesh-fragment.glsl'
import vertex from '/shaders/mesh-vertex.glsl'


export default class Sketch{
  constructor (options) {
    this.container = options.dom

    this.height = this.container.offsetHeight
    this.width = this.container.offsetWidth

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera( 70, this.width / this.height, 0.01, 10 )
    
    this.time = 0
    
    this.camera.position.z = 1

    this.renderer = new THREE.WebGLRenderer( { antialias: true } )

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
    this.geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 )

    // this.material = new THREE.ShaderMaterial({
    //   fragmentShader: fragment,
    //   vertexShader: vertex
    // })

    this.material = new THREE.MeshNormalMaterial()

    this.mesh = new THREE.Mesh( this.geometry, this.material )
    this.scene.add( this.mesh )
  }

  render () {
    this.mesh.rotation.x = this.time / 2
    this.mesh.rotation.y = this.time / 1
  
    this.renderer.render( this.scene, this.camera )

    this.time+=0.05
    console.log(this.time)
    window.requestAnimationFrame(this.render.bind(this))
  }
}

new Sketch({
  dom: document.getElementById('container') 
})

