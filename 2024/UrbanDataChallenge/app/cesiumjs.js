/*
Cesium JS 側の処理を記述。
Feature Service を参照するために ArcGIS REST JS を利用
*/

// ArcGIS の API キーを設定
Cesium.ArcGisMapService.defaultAccessToken = arcgis_apiKey;

// Cesium の API キーを設定
const cesiumAccessToken = "<Cesium_APIKey>";
Cesium.Ion.defaultAccessToken = cesiumAccessToken;

// ArcGIS REST JS を利用して Feature Service から geojson を取得
function queryGeoJSON(itemUrl,apikey){
    geojsondata=arcgisRest.queryFeatures({
        url: itemUrl,
        apikey,
        f:"geojson"
    }).then((response) => {
        return response
    });
    return geojsondata
}

// レイヤーの追加を関数化
async function cesium_addlayer(addlayer){
    // URL に FeatureServer が含まれる時は queryGeoJSON を実施
    if(addlayer.includes("FeatureServer")){ 
        queryGeoJSON(addlayer,arcgis_apiKey).then((value)=>{
            Cesium.GeoJsonDataSource.load(value,{
                clampToGround:true // 標高レイヤーに沿って描画
            }).then(function(dataSource) {
                // name プロパティに URL を設定
                dataSource.name = addlayer;
                // ビューアにデータソースを追加
                cesium_mainview.dataSources.add(dataSource);
              });
            });
        return null
    }else{
        // i3S 形式のデータを REST URL で参照し、i3SDataProvider を作成する
        let geoidService = await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl("https://tiles.arcgis.com/tiles/z2tnIkrLQ2BRzr6P/arcgis/rest/services/EGM2008/ImageServer");
        let addProvider = await Cesium.I3SDataProvider.fromUrl(addlayer, {
            geoidTiledTerrainProvider: geoidService,
            name:addlayer
        });
        return addProvider
    }   
}

// ベースマップの設定
const arcGisImagery = Cesium.ArcGisMapServerImageryProvider.fromBasemapType(Cesium.ArcGisBaseMapType.SATELLITE);

// Cesium の Viewer を設定
const cesium_mainview = new Cesium.Viewer('cesium', {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    baseLayer:Cesium.ImageryLayer.fromProviderAsync(arcGisImagery),
    timeline: false,
    animation: false,
    geocoder:false
});

// カメラ位置を設定
cesium_mainview.camera.setView({
    destination : Cesium.Cartesian3.fromDegrees(now_view.viewport.long, now_view.viewport.lat, now_view.height),
    orientation : {
        heading : Cesium.Math.toRadians(0.0),
        pitch : Cesium.Math.toRadians(now_view.pitch-90),
    }
});

// Plateau データの追加
cesium_addlayer(now_view.layerlist[0].url).then((value)=>{
    cesium_mainview.scene.primitives.add(value); 
});

// Cesium によるマップの操作後の view 情報を now_view に転載
function move_result(){
    now_view.control_lib="cesium";
    let cartographicPosition = Cesium.Cartographic.fromCartesian(cesium_mainview.scene.camera.positionWC);
    now_view.viewport.lat = Cesium.Math.toDegrees(cartographicPosition.latitude);
    now_view.viewport.long = Cesium.Math.toDegrees(cartographicPosition.longitude);
    now_view.center.lat = Cesium.Math.toDegrees(cartographicPosition.latitude);
    now_view.center.long = Cesium.Math.toDegrees(cartographicPosition.longitude);
    now_view.height=cartographicPosition.height;
    now_view.heading=Cesium.Math.toDegrees(cesium_mainview.scene.camera.heading);
    now_view.pitch=Cesium.Math.toDegrees(cesium_mainview.scene.camera.pitch)+90;
    observable.notifyObservers(now_view);
}

//イベントハンドラを設定
const handler = new Cesium.ScreenSpaceEventHandler(cesium_mainview.scene.canvas);

// 各操作のイベントハンドラ設定を関数化
function viewer_handleEvent(eventtype){
    if(eventtype==Cesium.ScreenSpaceEventType.WHEEL){
        handler.setInputAction(function() {
            clearTimeout(cesium_timeoutid);
            cesium_timeoutid = setTimeout( function () {
                move_result(); 
            },300);
        }, eventtype);        
    }else{
        handler.setInputAction(function() {
            move_result();
        }, eventtype);
    }
}

// ホイール/左右真ん中クリックをイベント登録
viewer_handleEvent(Cesium.ScreenSpaceEventType.WHEEL);
viewer_handleEvent(Cesium.ScreenSpaceEventType.LEFT_UP);
viewer_handleEvent(Cesium.ScreenSpaceEventType.MIDDLE_UP);
viewer_handleEvent(Cesium.ScreenSpaceEventType.RIGHT_UP);