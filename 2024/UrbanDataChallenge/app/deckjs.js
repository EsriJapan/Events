/*
DeckGL JS 側の処理を記述。
*/
const {DeckGL, PointCloudLayer,Tile3DLayer,FlyToInterpolator ,Controller ,GeoJsonLayer} = deck;
const {I3SLoader} = loaders;

let current_view;
let layerid=0;

// 初期の viewstate
const initialViewState = { 
  longitude:  now_view.center.long,
  latitude: now_view.center.lat,
  pitch: now_view.pitch, // カメラの縦角度
  maxPitch: 60, // カメラの最大縦角度
  minZoom: 2, // 最小ズームレベル
  maxZoom: 22,// 最大ズームレベル
  zoom: 15.5, // 0~22 段階で設定
  bearing: 0 // カメラの横角度
};

// deckgl の Viewer を設定
const deckgl_mainview = new DeckGL({
  mapStyle: `https://basemaps-api.arcgis.com/arcgis/rest/services/styles/ArcGIS:Imagery:Standard?type=style&token=${arcgis_apiKey}`,
  container:"deckgl",
  initialViewState: initialViewState,
  controller: true,
  onViewStateChange:({viewState})=>{ // view が変更された場合 current_view を上書き
    current_view=viewState;
    return current_view
  },
  onDragEnd:({})=>{ // zoom レベルは固定なので実装せず実装する場合は deckgl 内で wheel イベントで実装
    now_view.control_lib="deckgl";
    now_view.viewport.lat = current_view.latitude;
    now_view.viewport.long = current_view.longitude;
    now_view.center.lat = current_view.latitude;
    now_view.center.long = current_view.longitude;
    now_view.heading=current_view.bearing;
    now_view.pitch=current_view.pitch;
    observable.notifyObservers(now_view);
  },
  layers: [
    new Tile3DLayer({ // Plateau データを初期から追加
      id: 'tile-3d-layer',
      data: now_view.layerlist[0].url+'/layers/0',
      loader: I3SLoader,
    })
  ]
});

// レイヤーの追加を関数化
function deckgl_addlayer(addlayer){
  const existingLayers = deckgl_mainview.props.layers; // 現在 deckgl 上に描画されているレイヤー一覧
  // URL に FeatureServer が含まれる時は queryGeoJSON を実施
  if(addlayer.includes("FeatureServer")){
    layerId="point"+layerid;
    queryGeoJSON(addlayer,arcgis_apiKey).then((value)=>{
      let layer = new GeoJsonLayer({ // 表示するアイコン等パラメータを設定
          id: layerId,
          data: value,
          pickable: true,
          stroked: false,
          filled: true,
          extruded: true,
          pointType: 'circle',
          lineWidthScale: 20,
          lineWidthMinPixels: 2,
          getFillColor: [160, 160, 180, 200],
          getLineColor: [0, 255, 0, 255],
          getPointRadius: 100,
          getLineWidth: 1,
          getElevation: 30
        });
        deckgl_mainview.setProps({
          layers: [...existingLayers,
            layer
          ]
        });
    });

  }else{
    layerId="scenelayer"+layerid;
    if(addlayer!="PointCloud"){
      let layer=new Tile3DLayer({
        id: layerId, 
        data: addlayer+"/layers/0",
        loader: I3SLoader
      });
      deckgl_mainview.setProps({
        layers: [...existingLayers,
          layer
        ]
      });
    }
  }
  now_view.layerlist[now_view.layerlist.length-1].layerid=layerId;
  layerid++;
}

