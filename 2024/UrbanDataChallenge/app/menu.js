/*
Calcite Design System によるアイテムリストやメニューバーなどの UI 部分を設定
Hub コンテンツから Dcat 形式でデータを参照する部分もこちらで設定
*/

// Map View の エレメント を取得
const third_content=document.getElementById("thirdpt");
const arcgisview=document.getElementById("arcgis");
const deckview=document.getElementById("deckgl");
const deckicon=document.getElementById("deckicon");
const cesiumview=document.getElementById("cesium");

// Calcite Panel 内の エレメントを取得
const shellPanel = document.getElementById("shell-panel-end");
const flows = shellPanel.querySelectorAll("calcite-flow");
const addflow = document.getElementById("AddLayer");
const listflow = document.getElementById("LayersList");
const actionbar=document.getElementById("actionbar");
const actions = actionbar?.querySelectorAll("calcite-action");

// データの追加用の UI 周りのエレメントを取得
const adddcat=document.getElementById("Loaddcat");
const modal = document.getElementById("adddatamodal");
const dcaturl=document.getElementById("dcaturl");
const dcattitle=document.getElementById("dcattitle");
const addbtn = document.getElementById("add_btn");
const cancel = document.getElementById("cancel_btn");

// viewer の表示/非表示を選択する UI 系
const selectview=document.getElementById("view_select");
const multiple_items=selectview.querySelectorAll("calcite-dropdown-item");

// Viewer の表示・非表示設定
multiple_items.forEach(item =>{
    item.addEventListener("calciteDropdownItemSelect",function(e){
        for(let view of [arcgisview,deckview,cesiumview]){
            if(e.target.label==view.id){
                if(e.target.selected){
                    if(view.id=="arcgis"){
                        view.style.width="1%"; // 他のビューが操作されたときに arcgis を残しておくため。
                    }else{
                        view.hidden=true;
                        if(view.id=="deckgl"){
                            deckicon.hidden=true;
                            cesiumview.style.height="100%";
                        }else{
                            deckview.style.height="100%";
                        }
                    }
                }else{
                    if(view.id=="arcgis"){
                        view.style.width="100%";
                    }else{
                        view.hidden=false;
                        if(view.id=="deckgl"){
                            cesiumview.style.height="50%";
                            deckicon.hidden=false;
                        }else{
                            deckview.style.height="50%";
                        }
                    }
                }
            }
        }
        if(deckview.hidden && cesiumview.hidden){
            third_content.style.width="1%";
        }else{
            third_content.style.width="100%";
        }
    })
});


function LayerlistShow(calcite_list,viewslist){
    while(calcite_list.firstChild){
        calcite_list.removeChild(calcite_list.firstChild);
      }
    for(let layerinfo of viewslist){
        const listitem=document.createElement("calcite-list-item");
        listitem.label=layerinfo.title;
        listitem.id=layerinfo.layerid;
        listitem.value=`${layerinfo.accessURL},${layerinfo.url},${layerinfo.position}`; 
         // クリックしたらレイヤーに zoom する
        listitem.addEventListener("calciteListItemSelect",function(event){
            const zoom_id=event.target.id;
            for(let item of now_view.layerlist){
                if(item.layerid==zoom_id){
                    if(item.position.length<4){ // 一つの文字列として渡している場合の為の処理
                        now_view.zoomto=item.position[0].split(",");
                    }else{
                        now_view.zoomto=item.position;
                    }
                    break
                }
            };
            now_view.control_lib="layer_zoom";
            observable.notifyObservers(now_view);
        });
        
        const list_actions=document.createElement("calcite-action");
        list_actions.slot="actions-end";
        list_actions.scale="s";
        if(layerinfo.show){
            list_actions.icon="view-visible";
        }else{
            list_actions.icon="view-hide";
        }


        list_actions.addEventListener("click",function(event){
            const select_layer=event.target.parentNode;
            if(event.target.icon=="view-visible"){
                event.target.icon="view-hide";
                now_view.layerlist.forEach(item =>{
                    if(item.layerid==select_layer.id){
                        now_view.control_lib="layer_visible";
                        item.show=false;
                        observable.notifyObservers(now_view);
                    }
                });
            }else{
                event.target.icon="view-visible";
                now_view.layerlist.forEach(item =>{
                    if(item.layerid==select_layer.id){
                        now_view.control_lib="layer_visible";
                        item.show=true;
                        observable.notifyObservers(now_view);
                    }
                });
            }
        });

        listitem.append(list_actions);
        listitem.addEventListener("calciteListItemSelect", event => {
            // 消したら他のも同期するようにしたいんよ
            const parentid=event.target.closest("calcite-flow");
            const parts=event.target.value.split(",");
            const result = parts.slice(0, 2);
            const remaining = parts.slice(2).join(',');
            if (remaining) {
                result.push(remaining);
            }
            [content,rest,position]=result;
            createFlowItem(event, event.target.label, content,rest,position,parentid);
        });
        calcite_list.append(listitem);
        
    }
}

actions?.forEach(el => {
    el.addEventListener("click", function(event) {
        actions?.forEach(action => (action.active = false));
        flows?.forEach(flow=>{
            if(el.text==flow.id){
                if(flow.hidden==true){
                    if(flow.id=="LayersList"){
                        const calcitelist =flow?.querySelector("calcite-list");
                        LayerlistShow(calcitelist,now_view.layerlist);
                    }
                    flow.hidden=false;
                }else{
                    if(flow.id=="LayersList"){
                        const calcitelist =flow?.querySelector("calcite-list");
                        LayerlistShow(calcitelist,now_view.layerlist);
                    }
                    flow.hidden=false;
                    el.active = flow.closed;
                    shellPanel.collapsed = !shellPanel.collapsed;
                    flow.closed = !flow.closed;
                    flow.heading = event.target.text;
                }
            }else{
                flow.hidden=true;
            }
        });
        
    });
});

flows?.forEach(flow=>{
    if(flow.id=="AddLayer"){
        const block =flow?.querySelectorAll("calcite-block");
        block?.forEach(el => {
            if(el.id!="search"){
                el.addEventListener("calciteBlockOpen",event=>{
                    LoadDCAT(event.target.id,"https://mdpf-mlit-data.hub.arcgis.com/data.json","国土交通データプラットフォーム",event.target.heading);
                });
            }
        });
    }else if(flow.id=="LayersList"){
        const calcitelist =flow?.querySelector("calcite-list");
        LayerlistShow(calcitelist,now_view.layerlist);
    }
})



adddcat.addEventListener("click",function(event){
    const mainflow=event.target.parentElement;
    modal.open=true;
    addbtn.addEventListener("click",function(){
        if(dcaturl.value.includes("json")){
            const title = dcattitle.value!=""? `${dcattitle.value}`: "外部データセット";
            const block =mainflow?.querySelectorAll("calcite-block");
            block?.forEach(el => {
                if(el.id!="search"){
                    LoadDCAT(el.id,dcaturl.value,title,el.heading);
                }
            });
            dcattitle.value="";
            dcaturl.value="";
        }
    })
})

cancel.addEventListener("click",function(){
    modal.open=false;
})

function removeElementByCondition(array, conditionKey, conditionValue) {
    let removeid
    for (var i = array.length - 1; i >= 0; i--) {
      if (array[i][conditionKey] === conditionValue) {
        removeid=array[i]["layerid"];
        array.splice(i, 1);
        break;
      }
    }
    return removeid
  }

function createFlowItem(event, title,contentlink,restlink,position,parent) {
    let fab_state=event.target.getElementsByTagName("calcite-fab")[0];
    if(!fab_state){
        fab_state=document.createElement("calcite-fab");
        fab_state.icon="minus"
    }
    const newFlowItem = document.createElement("calcite-flow-item");
    newFlowItem.heading = "レイヤー情報";
    newFlowItem.description = title;

    const block = document.createElement("calcite-block");
    block.open = true;
    newFlowItem.append(block);

    const notice = document.createElement("calcite-notice");
    notice.open = true;
    notice.width = "full";
    block.append(notice);

    const noticeMessage = document.createElement("span");
    noticeMessage.slot = "message";
    noticeMessage.innerText = `${title}.`;
    notice.append(noticeMessage);

    const origin_link=document.createElement("calcite-link");
    origin_link.slot="link";
    origin_link.title=title;
    origin_link.href=contentlink;
    origin_link.target="_blank"
    origin_link.innerText="コンテンツへアクセス"
    origin_link.iconEnd="launch"
    notice.append(origin_link);

    const button = document.createElement("calcite-button");
    button.slot = "footer";
    button.width = "full";
    if(fab_state.icon=="plus"){
        button.innerText = "このレイヤーを追加する";
        button.value="add";
    }else if(fab_state.icon=="minus"){
        button.value="remove";
        button.kind="danger";
        button.innerText = "このレイヤーを削除する";
    }
    button.addEventListener("click", function (){
        button.loading=true;
        if(button.value=="add"){
            now_view.control_lib="addlayer";
            now_view.layerlist.push({title:title,accessURL:contentlink,url:restlink,show:true,position:[position]});
            observable.notifyObservers(now_view);
            button.value="remove";
            button.kind="danger";
            button.innerText = "このレイヤーを削除する";
        }else if(button.value=="remove"){
            now_view.control_lib="removelayer";
            now_view.removeitem.url=restlink;
            now_view.removeitem.id=removeElementByCondition(now_view.layerlist, "url", restlink);
            observable.notifyObservers(now_view);
            button.value="add";
            button.kind="brand";
            button.innerText = "このレイヤーを追加する";
        }
        button.loading=false;
    });
    newFlowItem.append(button);
    

    newFlowItem.addEventListener("calciteFlowItemBack", function (event){
        if(event.target.lastElementChild.value=="remove"){
            fab_state.icon="minus";
            fab_state.kind="danger";
        }else if(event.target.lastElementChild.value=="add"){
            fab_state.icon="plus";
            fab_state.kind="brand";
        }
    });
    parent.append(newFlowItem);
}

function LoadDCAT(blockid,dcat,sitetitle,servertype){
    const blocks=document.getElementById(blockid);
    if(!now_view.dcatlist[servertype].includes(dcat)){
        now_view.dcatlist[servertype].push(dcat);
        const section=document.createElement("calcite-block-section");
        section.text=sitetitle;
        section.open=true;
        blocks.append(section);
        const callist=document.createElement("calcite-list");
        section.append(callist);
        let process_loader = document.createElement("calcite-loader");
        blocks.append(process_loader);
        fetch(dcat)
        .then(response => {
            if (!response.ok) {
            throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // データの処理
            let item_list=data.dataset;
            let layertype_item=0;
            for(i=0; i<item_list.length; i++){
                const title=item_list[i].title;
                const landingpage=item_list[i].landingPage;
                const spatial = item_list[i].spatial.match(/[1-9]/gi)!=null? `${item_list[i].spatial}`: "0,0,0,0"; // 数字が無かった場合
                const data_list=item_list[i].distribution;
                for(num=0;num<data_list.length;num++){
                    if(data_list[num].format=="ArcGIS GeoServices REST API"){
                        if(data_list[num].accessURL.includes(servertype)) {
                            layertype_item=1;
                            const listitem=document.createElement("calcite-list-item");
                            listitem.label=title;
                            listitem.value=`${landingpage},${data_list[num].accessURL},${spatial}`;
                            const list_actions=document.createElement("calcite-fab");
                            list_actions.slot="actions-end";
                            list_actions.scale="s";
                            list_actions.text="レイヤーを地図に追加する";
                            list_actions.value=data_list[num].accessURL;
                            if(now_view.layerlist.includes(list_actions.value)){
                                list_actions.icon="minus";
                                list_actions.kind="danger";
                                list_actions.text="レイヤーを地図から削除する";
                            }else{
                                list_actions.text="レイヤーを地図に追加する";
                            }
                            list_actions.addEventListener("click", function (){
                                list_actions.loading=true;
                                if(list_actions.icon=="plus"){
                                    now_view.control_lib="addlayer";
                                    now_view.layerlist.push({title:title,accessURL:landingpage,url:list_actions.value,show:true,position:spatial.split(",")})
                                    observable.notifyObservers(now_view);
                                    list_actions.text="レイヤーを地図から削除する";
                                    list_actions.icon="minus";
                                    list_actions.kind="danger";
                                }else if(list_actions.icon=="minus"){
                                    now_view.control_lib="removelayer";
                                    now_view.removeitem.url=list_actions.value;
                                    now_view.removeitem.id=removeElementByCondition(now_view.layerlist, "url", list_actions.value);
                                    observable.notifyObservers(now_view);
                                    list_actions.icon="plus";
                                    list_actions.kind="brand";
                                    list_actions.text="レイヤーを地図に追加する";
                                }
                                list_actions.loading=false;
                            });

                            listitem.append(list_actions);
                            callist.append(listitem);

                            listitem.addEventListener("calciteListItemSelect", event => {
                                const parentid=event.target.closest("calcite-flow");
                                const parts=event.target.value.split(",");
                                const result = parts.slice(0, 2);
                                const remaining = parts.slice(2).join(',');
                                if (remaining) {
                                    result.push(remaining);
                                }
                                [content,rest,position]=result;
                                createFlowItem(event, event.target.label, content,rest,position,parentid);
                            });

                        }
                    }
                }
                
            }
            process_loader.hidden=true;
            if(!layertype_item){
                section.hidden=true
            }
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });

    }
    
}
