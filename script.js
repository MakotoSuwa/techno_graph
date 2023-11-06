let soundVolume = document.getElementById('soundVolume');

class Audio {
  constructor(soundUrl){

      this.listener = new THREE.AudioListener();
      const audio = new THREE.Audio( this.listener );
      this.xhr = 0;
      
      this.audioLoader = new THREE.AudioLoader();
      this.audioLoader.load( soundUrl, 
          function( buffer ) {
              audio.setBuffer( buffer );
              audio.setLoop( true );
              audio.setVolume( soundVolume.value );
          },
          // onProgress callback
          function ( xhr ) {
              if (xhr.loaded / xhr.total * 100 === 100) {
                  setTimeout(() => {
                      document.getElementById( 'overlay' ).style.display = "block";
                  }, 1000)
              }else{}
          },
          // onError callback
          function ( err ) {
              console.log( 'An error happened' );
          }
      );
      soundVolume.addEventListener('change', () => {
        audio.setVolume(soundVolume.value);
      });
      this.soundPlay = () => {
          audio.play();
      }
      this.analyser = [];
      this.analyser = new THREE.AudioAnalyser( audio, 256 );
  }

  update(){
      this.FrequencyData = this.analyser.getFrequencyData();
      this.AverageFrequency = this.analyser.getAverageFrequency();
  }
  
}


class Canvas {
  constructor() {
    /************************/
    /*インタラクション用*/
    /************************/

    //スクロール量
    this.scrollY = 0;
    //マウス座標
    this.mouse = new THREE.Vector2(0.5, 0.5);
    this.targetRadius = 0.05;// 半径の目標値
    //ウィンドウサイズ
    this.w = window.innerWidth;
    this.h = window.innerHeight;

    /************************/
    /*シーン設定*/
    /************************/

    // レンダラー
    this.renderer = new THREE.WebGLRenderer({
      antialias: true
    });
    this.renderer.setSize(this.w, this.h);// 描画サイズ
    this.renderer.setPixelRatio(window.devicePixelRatio);// ピクセル比
    this.renderer.setClearColor( 0xEEEEEE );

    //#myCanvasにレンダラーのcanvasを追加
    const container = document.getElementById("myCanvas");
    container.appendChild(this.renderer.domElement);

    // カメラ
    /*js上の数値をpixelに変換する処理*/
    const fov    = 60;
    const fovRad = (fov / 2) * (Math.PI / 180);// 視野角をラジアンに変換
    const dist   = (this.h / 2) / Math.tan(fovRad);// ウィンドウぴったりのカメラ距離
    /* */
    this.camera = new THREE.PerspectiveCamera(fov, this.w / this.h, 1, dist * 2);
    this.camera.position.z = dist;// カメラを遠ざける
    

    // シーン
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xCCCCCC, 0, 2000);

    // ライト
    this.pointLight = new THREE.PointLight(0xffffff);
    this.pointLight.position.set(40, 40, 0);// ライトの位置を設定
    this.scene.add(this.pointLight);

    this.ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.9);
    this.scene.add(this.ambientLight);

   
    // 平面をつくる（幅, 高さ, 横分割数, 縦分割数）
    const plane = new THREE.PlaneGeometry(2, 2, 10, 10);
    // シェーダーソースを渡してマテリアルを作成
    this.uniforms = {
      "u_time": { value: 1.0 },
      "u_resolution": { type: "v2", value: new THREE.Vector2(this.renderer.domElement.width,this.renderer.domElement.height) },
      "u_mouse": {value: new THREE.Vector2(0.5, 0.5)},
      "u_scrollY": {value: 0.0},
      "u_radius": {value: this.targetRadius},
      "u_volume" : {value: 0.0},
      "u_Frequency_Low" : {value: 0.0},
      "u_Frequency_Mid" : {value: 0.0},
      "u_Frequency_High" : {value: 0.0}
    };
    const plane_mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: document.getElementById( 'vertexShader' ).textContent,
      fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
      wireframe: false
    });
    this.plane = new THREE.Mesh(plane, plane_mat);
    this.scene.add(this.plane);



    /************************/
    /*画面更新*/
    /************************/

    this.renderer.render(this.scene, this.camera);
    const overlay = document.getElementById( 'overlay' );
    const url = 'sound.mp3';
    this.audio1 = new Audio(url);
    overlay.addEventListener('click', e => {
        overlay.remove();
        this.audio1.soundPlay();
        this.render();
    });
 
  }

  render() {

    requestAnimationFrame(() => { this.render(); });
    
    // ミリ秒から秒に変換
    const sec = performance.now() / 1000;
    this.plane.material.uniforms.u_time.value += 1;
    // シェーダーを更新
    this.uniforms.u_mouse.value.lerp(this.mouse, 0.05);
    this.audio1.update();


    //DOM操作

    let volumeDisplay = document.getElementById('volumeDisplay');
    volumeDisplay.textContent = `VOLUME: ${this.uniforms.u_volume.value}`;
    let lowDisplay = document.getElementById('lowDisplay');
    lowDisplay.textContent = `LOW: ${this.uniforms.u_Frequency_Low.value}`;
    let midDisplay = document.getElementById('midDisplay');
    midDisplay.textContent = `MID: ${this.uniforms.u_Frequency_Mid.value}`;
    let highDisplay = document.getElementById('highDisplay');
    highDisplay.textContent = `HIGH: ${this.uniforms.u_Frequency_High.value}`;
   
    // FrequencyDataをDataTextureに変換する
    const texture = new THREE.DataTexture(this.audio1.FrequencyData, 256, 1, THREE.LuminanceFormat);
    texture.needsUpdate = true;
    this.uniforms.u_FrequencyData = { value: texture };
    this.uniforms.u_volume.value = this.audio1.AverageFrequency*0.0003;

    this.uniforms.u_Frequency_Low.value =this.uniforms.u_FrequencyData.value.image.data[0]*0.0001;
    this.uniforms.u_Frequency_Mid.value =this.uniforms.u_FrequencyData.value.image.data[63]*0.0001;
    this.uniforms.u_Frequency_High.value =this.uniforms.u_FrequencyData.value.image.data[127]*0.0001;

    if( this.uniforms.u_volume.value > 0.03 ){
    this.uniforms.u_Frequency_Low.value = this.uniforms.u_FrequencyData.value.image.data[0]*getRandom(-0.001,0.001);
    this.uniforms.u_Frequency_Mid.value =this.uniforms.u_FrequencyData.value.image.data[63]*getRandom(-0.001,0.001);
    this.uniforms.u_Frequency_High.value = getRandom(-0.0008,0.0008);
    }

    if( this.uniforms.u_volume.value < 0.02 ){
      this.uniforms.u_Frequency_Low.value =this.uniforms.u_FrequencyData.value.image.data[5]*0.0001;
      this.uniforms.u_Frequency_Mid.value =this.uniforms.u_FrequencyData.value.image.data[43]*0.0001;
      this.uniforms.u_Frequency_High.value =this.uniforms.u_FrequencyData.value.image.data[120]*0.0001;
    }

    this.renderer.render(this.scene, this.camera);
    
  }

  mouseMoved(x, y) {
    this.mouse.x =  x / this.w;// 原点を中心に持ってくる
    this.mouse.y = 1.0 - (y / this.h);// 軸を反転して原点を中心に持ってくる
  }

  scrolled(y) {
    this.scrollY = y;        
  }

  resized() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.renderer.setSize(this.w, this.h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
    this.uniforms.u_resolution.value = new THREE.Vector2(this.renderer.domElement.width,this.renderer.domElement.height);
  }
};

//このクラス内に ページごとのcanvas外の処理を書いていきます
window.addEventListener('DOMContentLoaded', function(){

  const canvas = new Canvas();
  canvas.scrolled(window.scrollY);

  /************************/
  /*addEventListener*/
  /************************/

  window.addEventListener('mousemove', e => {
    canvas.mouseMoved(e.clientX, e.clientY);
  });

  window.addEventListener('scroll', e => {
    canvas.scrolled(window.scrollY);
  });

  window.addEventListener('resize', e => {
    canvas.resized();
  });

});

getRandom = (min, max) => {
  return Math.random() * (max - min)  + min;
};