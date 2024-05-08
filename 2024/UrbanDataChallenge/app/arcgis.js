/*
ArcGIS Maps SDK for JavaScript 側の処理を記述している。
他にも下記の処理を実装:
    ・各ライブラリで行われているビューや各レイヤーの状態の変更をキャッチし、各ビューを変更する処理
    ・現在の各ライブラリのビュー情報を保持
    ・取得してきたアイテムリストから名前検索する機能
    ・取得してきたアイテムリストから空間検索をするための機能
*/

// 各ライブラリのビューの状態を保持する
const now_view={
    control_lib:"arcgis", // 何によって変更があったかを記述
    viewport:{
        lat: 35.6812,
        long:139.7671
    },
    center:{
        lat: 35.68869457744634,
        long:139.7671   
    },
    zoom:15.5, // カメラではなく、地図へのズームレベル
    height:700, // カメラの高さ
    heading:0, // カメラの向き
    pitch:50, // カメラの角度
    layerlist:[
        {
            title: "東京都23区・八王子市南大沢 3D都市モデル", // アイテム名
            accessURL:"https://www.arcgis.com/home/item.html?id=ca7baa183c6e4c998a668a6fadc5fc49", // アクセス用の URL を追記
            url:"https://tiles.arcgis.com/tiles/wlVTGRSYTzAbjjiC/arcgis/rest/services/13100_13201_Tokyo-23ku_Minamiosawa_Building/SceneServer", // 参照のための REST URL
            show:true, // layer の表示/非表示状態のステータス
            layerid:"tile-3d-layer", // レイヤー操作の際の一意の id として保持
            position:[139.3637249665917,35.53265521156409,139.91754313475815,35.81742435162177] // レイヤーの中心点
        }
    ],
    removeitem:{}, // 削除されたアイテムの情報を一時的に保持する場所
    zoomto:[], // アイテムにズームする際に layerlist.position を保持する場所
    dcatlist:{ // シーンとフィーチャそれぞれ何のサーバーが追加されているかのリストを保持
        SceneServer:[], 
        FeatureServer:[]
    }
}

// mainview を取得
const mainview=document.getElementById("main");

// 空間検索と名前検索の input タグを取得
const search_name=document.getElementById("namefilter");
const search_extent=document.getElementById("extentfilter");

function Observable() {// now_view が変更されたあとに発火するイベントとして用意
    this.observers = [];
}

Observable.prototype.addObserver = function(observer) {
    this.observers.push(observer);
};

Observable.prototype.notifyObservers = function(data) {
    this.observers.forEach(function(observer) {
        observer(data);
    });
};

let observable = new Observable();

const arcgis_apiKey="<ArcGIS_APIKEY>";

// viewer に変更があった場合に利用する updateview を返す
function update_viewer(viewport_lat,viewport_long,center_lat,center_long,zoomlv,height,heading,pitch){
    let update_view={
        viewport:{
            lat:viewport_lat,
            long:viewport_long
        },
        center:{
            lat: center_lat,
            long:center_long  
        },
        zoom:zoomlv,
        height:height, 
        heading:heading, 
        pitch:pitch 
    };
    return update_view
}

require([
    "esri/widgets/Sketch/SketchViewModel", 
    "esri/config", 
    "esri/Map",
    "esri/Graphic",
    "esri/request",
    "esri/views/MapView",
    "esri/views/SceneView", 
    "esri/layers/FeatureLayer",
    "esri/layers/SceneLayer",
    "esri/layers/PointCloudLayer",
    "esri/layers/GraphicsLayer",
    "esri/geometry/Point",
    "esri/geometry/Polygon",
    "esri/Camera",
    "esri/geometry/geometryEngine",
    "esri/geometry/SpatialReference",
    "esri/geometry/projection"
    ], function(SketchViewModel,esriConfig, Map, Graphic,esriRequest,MapView,SceneView,FeatureLayer,SceneLayer,PointCloudLayer,GraphicsLayer,Point,Polygon,Camera,geometryEngine,SpatialReference,projection) {

    esriConfig.apiKey=arcgis_apiKey;

    const basemap = new Map({
        basemap: {style:{
            id:"arcgis/imagery/standard",
            language:"ja"
    }
    },
        ground: "world-elevation"
    });
    const arcgis_mainview = new SceneView({ 
        map: basemap,
        camera: {
            tilt:now_view.pitch, 
            heading:0,
            position: {
                longitude:now_view.viewport.long,
                latitude:now_view.viewport.lat ,
                z:now_view.height 
            }
        },
        container: "arcgis" 
    });
    
    function arcgis_change_view(viewer,viewinfo){
        let view_position= viewinfo?? now_view.viewport;
        viewer.goTo(
            new Camera({
            tilt:now_view.pitch, 
            heading:now_view.heading,
            position: {
                longitude:view_position.longitude, 
                latitude:view_position.latitude,
                z:now_view.height
            }
        }));
    }

    function deckgl_change_view(viewer,viewinfo){
        let view_position= viewinfo?? now_view.center;
        let viewState = {
            zoom:15, //zoom レベルは固定
            longitude:view_position.longitude?? view_position.long, 
            latitude:view_position.latitude?? view_position.lat,
            pitch: now_view.pitch,
            bearing:now_view.heading,
            transitionDuration: 1000,
            transitionInterpolator: new FlyToInterpolator()
        };
        viewer.setProps({
            initialViewState:viewState
        });
    }

    function cesium_change_view(viewer,viewinfo){
        let view_position= viewinfo?? now_view.viewport;
        viewer.camera.flyTo({
            destination : Cesium.Cartesian3.fromDegrees(view_position.longitude?? view_position.long,view_position.latitude?? view_position.lat, now_view.height),
            orientation : {
                heading : Cesium.Math.toRadians(now_view.heading),
                pitch : Cesium.Math.toRadians(now_view.pitch-90),
            }
        });
    }

    // JS アイコンを右上に表示するように設定
    var imageUrl = "./ArcGISJS.png";    
    var imgElement = document.createElement("img");
    imgElement.src = imageUrl;
    arcgis_mainview.ui.add({
        component: imgElement,
        position: "top-right",
        index: 0
    });

    // Plateau のデータを追加
    const plateau=new SceneLayer({
        url: now_view.layerlist[0].url
    });
    arcgis_mainview.map.add(plateau);
 
    function panto_layer(item) { // ビューの視点を特定のアイテムにズームする
        arcgis_change_view(arcgis_mainview,item);
        deckgl_change_view(deckgl_mainview,item);
        cesium_change_view(cesium_mainview,item);
    }

    // arcgis 側のマップ操作時のイベントを取得して、各ライブラリに反映させる
    arcgis_mainview.on("drag,mouse-wheel,double-click", function(event){
        now_view.control_lib="arcgis";
        let viewport_camera=arcgis_mainview.viewpoint.camera;
        switch(event.type){
            case "drag":
                if(event.action=="end"){
                    Object.assign(now_view,update_viewer(viewport_camera.position.latitude,
                        viewport_camera.position.longitude,
                        arcgis_mainview.center.latitude,
                        arcgis_mainview.center.longitude,
                        null,
                        viewport_camera.position.z,
                        viewport_camera.heading,
                        viewport_camera.tilt));
                    observable.notifyObservers(now_view); 
                }
                break
            case "mouse-wheel":
                Object.assign(now_view,update_viewer(viewport_camera.position.latitude,
                    viewport_camera.position.longitude,
                    arcgis_mainview.center.latitude,
                    arcgis_mainview.center.longitude,
                    arcgis_mainview.zoom,
                    viewport_camera.position.z,
                    viewport_camera.heading,
                    viewport_camera.tilt));
                observable.notifyObservers(now_view);
                break
            case "double-click": 
                Object.assign(now_view,update_viewer(viewport_camera.position.latitude,
                    viewport_camera.position.longitude,
                    arcgis_mainview.center.latitude,
                    arcgis_mainview.center.longitude,
                    arcgis_mainview.zoom,
                    viewport_camera.position.z,
                    viewport_camera.heading,
                    viewport_camera.tilt));
                observable.notifyObservers(now_view);
                break   
        }
    });
    observable.addObserver(function(now_view) { // イベントが発火したあとの処理
        if(now_view.control_lib=="layer_zoom"){ 
            const zoomto=now_view.zoomto;
            const item_geometry= createGeometry([
                        [zoomto[0],zoomto[1]], // min min
                        [zoomto[0],zoomto[3]], // min max 
                        [zoomto[2],zoomto[3]], // max max
                        [zoomto[2],zoomto[1]] // max min
                    ]);
            panto_layer(item_geometry.extent.center);
        }else if(now_view.control_lib=="layer_visible"){
            // ここにレイヤーを表示するしないを操作
            now_view.layerlist.forEach(item =>{
                for(let layer of arcgis_mainview.map.layers.items){
                    if(item.url.includes(layer.url)){
                        layer.visible=item.show;
                    }
                }
                const decklayers=[];
                for(let count=0; count<deckgl_mainview.props.layers.length;count++){
                    const lyr=deckgl_mainview.props.layers[count];
                    if(lyr.visible!=item.show && lyr.id==item.layerid){
                        let clone_lyr=lyr.clone({visible:item.show});
                        decklayers.push(clone_lyr);
                    }else{
                        decklayers.push(lyr)
                    }
                }
                deckgl_mainview.setProps({
                    layers: decklayers
                });
                for(var i=0;i<cesium_mainview.scene.primitives.length;i++){
                    const cesium_prim=cesium_mainview.scene.primitives.get(i);
                    if(cesium_prim.name==item.url){
                        cesium_prim.show=item.show;
                    }
                }
                for(var i=0;i<cesium_mainview.dataSources.length;i++){
                    const cesium_data=cesium_mainview.dataSources.get(i);
                    if(cesium_data.name==item.url){
                        cesium_data.show=item.show;
                    }
                }
            });
        }else if(now_view.control_lib=="addlayer"){
            const serviceUrl=now_view.layerlist[now_view.layerlist.length-1].url;
            if(serviceUrl.includes("FeatureServer")){
                esriRequest(serviceUrl, {
                    query:{
                        where:"1=1",
                        f:"json"
                    },
                    responseType: "json"
                }).then(function(response) {
                    const layerinfo=response.data;
                    if(layerinfo.type==="Table"){
                        const alert=document.createElement("calcite-alert");
                        alert.icon="rangefinder";
                        alert.autoClose=true;
                        alert.open=true;
                        alert.label="未対応";
                        alert.autoclose=true;
                        const alert_title=document.createElement("div");
                        alert_title.slot="title";
                        alert_title.innerText="このデータはテーブルレイヤーです";
                        alert.append(alert_title);
                        const alert_msg=document.createElement("div");
                        alert_msg.slot="message";
                        alert_msg.innerText="このデータ形式には現在対応していません";
                        alert.append(alert_msg);
                        mainview.append(alert);
                    }else{
                        const featureitem = new FeatureLayer({
                            url: serviceUrl
                        });
                        arcgis_mainview.map.add(featureitem);
                        featureitem.when(function(){
                            panto_layer(featureitem.fullExtent.center);
                            const popupTemplate = featureitem.createPopupTemplate();
                            featureitem.popupTemplate = popupTemplate;
                            cesium_addlayer(serviceUrl);
                            deckgl_addlayer(serviceUrl);
                    });
                }
            });
            }else{
                esriRequest(serviceUrl, {
                    responseType: "json"
                }).then(function(response) {
                    const layerinfo=response.data.layers[0];
                    if (layerinfo.layerType === "3DObject") {
                        const sceneitem= new SceneLayer({
                            url:serviceUrl
                        });
                        arcgis_mainview.map.add(sceneitem);
                        sceneitem.when(function(){
                            panto_layer(sceneitem.fullExtent.center);
                            cesium_addlayer(serviceUrl).then((value)=>{
                                cesium_mainview.scene.primitives.add(value); // シーンレイヤーの追加
                            });
                            deckgl_addlayer(serviceUrl,layerinfo.layerType);
                        });
                    }else if(layerinfo.layerType === "PointCloud"){
                        const pointclouditem = new PointCloudLayer({
                            url: serviceUrl
                        });
                        arcgis_mainview.map.add(pointclouditem);
                        pointclouditem.when(function(){
                            panto_layer(pointclouditem.fullExtent.center);
                            deckgl_addlayer(layerinfo.layerType); // ポイントクラウド は未対応 https://loaders.gl/docs/modules/i3s/recipes/building-scene-layer
                        });
                    }
                }).catch(function(error) {
                    console.error("Error fetching metadata:", error);
                  });
            }
            
        }else if(now_view.control_lib=="removelayer"){ // レイヤーの削除処理が走ったとき
            for(let item of arcgis_mainview.map.layers.items){
                if(now_view.removeitem.url.includes(item.url)){
                    arcgis_mainview.map.remove(item);
                    break;
                }
            }
            for(let count=0; count<deckgl_mainview.props.layers.length;count++){
                const lyr=deckgl_mainview.props.layers[count];
                if(now_view.removeitem.id==lyr.id){
                    deckgl_mainview.props.layers.splice(deckgl_mainview.props.layers.indexOf(lyr),1)
                    deckgl_mainview.setProps({
                        layers: [...deckgl_mainview.props.layers]
                      });
                }
            }
            for(var i=0;i<cesium_mainview.scene.primitives.length;i++){
                if(cesium_mainview.scene.primitives.get(i).name==now_view.removeitem.url){
                    cesium_mainview.scene.primitives.remove(cesium_mainview.scene.primitives.get(i));
                }
            }
            for(var i=0;i<cesium_mainview.dataSources.length;i++){
                if(cesium_mainview.dataSources.get(i).name==now_view.removeitem.url){
                    cesium_mainview.dataSources.remove(cesium_mainview.dataSources.get(i));
                }
            }
           
        }else{
            if(now_view.control_lib!="arcgis"){
                if(now_view.control_lib=="deckgl"){
                    arcgis_mainview.goTo([now_view.center.long,now_view.center.lat])
                    .then(function(){
                        now_view.viewport.lat=arcgis_mainview.viewpoint.camera.position.latitude;
                        now_view.viewport.long=arcgis_mainview.viewpoint.camera.position.longitude;
                        cesium_change_view(cesium_mainview);
                    });

                }else if(now_view.control_lib=="cesium"){
                    arcgis_mainview.goTo(new Camera({ // 非同期での処理を実装したいため arcgis_change_view() は利用しない
                        tilt:now_view.pitch,
                        heading:now_view.heading,
                        position: {
                            longitude:now_view.viewport.long, 
                            latitude:now_view.viewport.lat,
                            z:now_view.height  
                        }
                    })).then( function(){
                        now_view.center.long=arcgis_mainview.center.longitude;
                        now_view.center.lat=arcgis_mainview.center.latitude;
                        deckgl_change_view(deckgl_mainview);
                        })
                }
            }else if(now_view.control_lib=="arcgis"){
                deckgl_change_view(deckgl_mainview);
                console.log(now_view.height);
                cesium_change_view(cesium_mainview);
            }
        }
        });

        // 空間検索のためのミニマップの設定
        const graphicsLayer = new GraphicsLayer();
        const minimap_spatialReference= new SpatialReference({
            wkid:4326
        })
        const centerPoint = new Point({
            latitude: now_view.center.lat,
            longitude: now_view.center.long,
            spatialReference: minimap_spatialReference
          });

        const minimap = new MapView({
              container:"mapview",
              SpatialReference: minimap_spatialReference,
              map:new Map({
                basemap: "dark-gray",
                layers:[graphicsLayer]
              }),
              center:centerPoint,
              zoom:6,
              constraints:{
                minZoom:3
              }
        });
        // zoom ボタンを削除
        minimap.ui.remove("zoom");
        setUpGraphicClickHandler();

        minimap.when(()=>{ // minimap 上にイベントを設定
            addGraphics();
            sketchViewModel = new SketchViewModel({
                view: minimap,
                layer: graphicsLayer,
                updateOnGraphicClick: false,
                defaultUpdateOptions: {
                  toggleToolOnClick: false
                }
              });
              sketchViewModel.on(["update"], onGraphicUpdate);
        });

        function onGraphicUpdate(event) { // sketchViewModel がアップデートされたときに走る関数
            if (
              event.toolEventInfo &&
              (event.toolEventInfo.type === "move-stop" || event.toolEventInfo.type === "reshape-stop")
            ) {
              filteritem();
            }
          }

        function addGraphics() {
            const Vertices = [ // ポリゴンの初期情報
              [138.817058, 35.098906], 
              [138.817058, 36.090509],  
              [140.239788, 36.090509],  
              [140.239788, 35.098906] 
            ];

            const polygon=createGeometry(Vertices);
            const fillSymbol = { // ポリゴンのシンボル設定
                type: "simple-fill", 
                color: [227, 139, 79, 0.8],
                outline: {
                  color: [255, 255, 255],
                  width: 1
                },
                opacity:0.8
              };

            const extentGraphic = new Graphic({ // ポリゴンの Graphic 設定
                geometry:polygon,
                symbol: fillSymbol,
                attributes: {
                 newDevelopment: "new store"
                }
            });
            graphicsLayer.add(extentGraphic);
          }

          function createGeometry(vertices) { // polygon の作成
            return new Polygon({
              rings: vertices,
              spatialReference:minimap_spatialReference
            });
          }
          
          function setUpGraphicClickHandler() { // ポリゴンにクリックしたときはポリゴンの形状を変更できるようにする
            minimap.on("click", (event) => {
              if (sketchViewModel.state === "active") {return;}
              minimap.hitTest(event).then((response) => {
                const results = response.results;
                results.forEach((result) => {
                  if (
                    result.graphic.layer === sketchViewModel.layer &&
                    result.graphic.attributes &&
                    result.graphic.attributes.newDevelopment
                  ) {
                        sketchViewModel.update([result.graphic], { tool: "transform" });
                  }
                });
              });
            });
          }

        function filteritem(){ // アイテム名と空間検索がオンになっているときの検索を実装
            const search_items=addflow.getElementsByTagName("calcite-list-item");
            for (let item of search_items){
                item.hidden=false;
                if(search_name.value){
                    const reg=new RegExp(search_name.value, 'gi');
                    if(!item.label.match(reg)){ // アイテムの名前に検索したい名前が含まれていない時
                        item.hidden=true;
                    }
                }
                if(search_extent.open){ // セクションが open 状態の時のみ
                    // ここで特定の範囲で検索が有効な時に intersects を実行するようにする
                    const item_spatial=item.value.split(",").slice(2);
                    const item_geom= createGeometry([ 
                        [item_spatial[0],item_spatial[1]], 
                        [item_spatial[0],item_spatial[3]], 
                        [item_spatial[2],item_spatial[3]], 
                        [item_spatial[2],item_spatial[1]] 
                    ]);
                    const extent= projection.project(graphicsLayer.graphics.items[0].geometry,minimap_spatialReference);
                    const intersects = geometryEngine.intersects(item_geom, extent);
                    if(!intersects){ // エリア内に含まれていない時
                        item.hidden=true;
                    }
                }
            }
        }
        // アイテム名の入力覧に入力されたら filteritem イベントが発火
        search_name.addEventListener("calciteFilterChange",() =>{filteritem()});
        // マップにクリックしたタイミングで filteritem イベントが発火 
        search_extent.addEventListener("click",()=>{filteritem()});
});

    

