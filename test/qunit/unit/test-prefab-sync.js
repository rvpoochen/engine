(function () {

    if (!TestEditorExtends) {
        return;
    }

    var MyComponent = cc.Class({
        name: '8537489053431',
        extends: CallbackTester,
        editor: {
            executeInEditMode: true
        }
    });

    var UUID = '19941122';
    var DEBUG_SERIALIZED_PREFAB = 0 && !isPhantomJS;

    var parent = new cc.Node('parent');
    parent.addComponent(MyComponent);
    parent.scale = cc.v2(123, 432);
    parent.x = 1020;
    parent.active = false;

    var child = new cc.Node('child');
    child.addComponent(MyComponent);
    child.scale = cc.v2(3, 2);
    child.parent = parent;
    child.y = 1029;
    child.active = false;

    var prefabAsset;
    var prefabJson;
    var parentJson;
    var reloadedParent;

    (function beforeAll () {

        // CREATE PREFAB ASSET

        _Scene.PrefabUtils.createPrefabFrom(parent);
        //var asset = new cc.Prefab();
        //asset.data = parent;
        parent._prefab.asset._uuid = UUID;
        //_Scene.PrefabUtils.setPrefabAsset(parent, Editor.serialize.asAsset());
        _Scene.PrefabUtils.setPrefabSync(parent, true);

        // apply sync property
        prefabAsset = _Scene.PrefabUtils.createAppliedPrefab(parent);

        // 重新生成已经加载好的 prefab，去除类型，去除 runtime node
        prefabJson = Editor.serialize(prefabAsset, { stringify: false });
        prefabAsset = cc.deserialize(prefabJson);
        prefabAsset._uuid = UUID;

        // SAVE SCENE ASSET

        parentJson = Editor.serialize(parent, { stringify: false });
        if (DEBUG_SERIALIZED_PREFAB) {
            console.log(JSON.stringify(parentJson, null, 4));
        }
        reloadedParent = cc.deserialize(parentJson);
        reloadedParent._prefab.asset = prefabAsset;
        //reloadedParent.children[0]._prefab.asset = prefabAsset;
    })();

    test('prefab info', function () {
        strictEqual(parent._prefab.sync, true, "sync property should be saved to root prefab info");
    });

    test('prefab asset should not discard content if sync enabled', function () {
        var nodeToSave = prefabAsset.data;
        ok(nodeToSave.children.length > 0, 'children should be saved');
        var childToSave = nodeToSave.children[0];
        strictEqual(nodeToSave.scaleX, parent.scaleX, 'root scale should be saved');
        strictEqual(childToSave.scaleY, child.scaleY, 'child scale should be saved');
        ok(nodeToSave.getComponent(cc.Component), 'root component should be saved');
        ok(childToSave.getComponent(cc.Component), 'child component should be saved');
        strictEqual(childToSave.name, child.name, 'child name should be saved');
        strictEqual(nodeToSave.active, false, 'root active should be saved');
        strictEqual(childToSave.active, false, 'child active should be saved');
    });

    test('sync config saved in prefab asset', function () {
        var nodeToSave = prefabAsset.data;
        strictEqual(nodeToSave._prefab.sync, false, 'sync config should not saved');
    });

    test('saved scene node if sync enabled', function () {
        strictEqual(reloadedParent.scaleX, 1, 'all scale should not saved');
        strictEqual(reloadedParent.getComponent(cc.Component), null, 'all component should not saved');
        strictEqual(reloadedParent.x, parent.x, 'root position should be saved');
        strictEqual(reloadedParent.name, parent.name, 'root name should be saved');
        strictEqual(reloadedParent.active, false, 'root active should be saved');
        ok(reloadedParent.children.length === 0, 'children should not saved');

        var prefabInfo = reloadedParent._prefab;
        ok(prefabInfo, 'prefab info should be saved');
        ok(prefabInfo.asset, 'asset should be saved');
        strictEqual(prefabInfo.sync, true, 'sync should be saved');
        strictEqual(prefabInfo.fileId, parent.uuid, 'fileId should be saved');

        //ok(reloadedParent.children.length > 0, 'children should be saved');
        //var reloadedChild = reloadedParent.children[0];
        //strictEqual(reloadedChild.y, 0, 'child position should not saved');
        //notEqual(reloadedChild.name, child.name, 'child name should not saved');
        //strictEqual(reloadedChild.active, true, 'child active should not saved');
    });

    test('prefab info in exported scene if syncable', function () {
        var reloadedParent = cc.deserialize(Editor.serialize(parent, { stringify: false, exporting: true }));
        ok(reloadedParent._prefab, 'prefab info should be saved');
        strictEqual(reloadedParent._prefab.sync, true, 'sync should be saved');
        strictEqual(reloadedParent._prefab.fileId, parent.uuid, 'fileId should be saved');
    });

    function testInstantiatedNode (newNode) {
        var prefabInfo = newNode._prefab;
        ok(prefabInfo, "new node should preserve the prefab info");
        ok(newNode.children.length > 0, 'instantiated node should have children');
        ok(newNode.getComponent(cc.Component), 'instantiated node should have component');
        return newNode;
    }
    test('instantiated prefab asset', function () {
        var newNode = cc.instantiate(prefabAsset);
        testInstantiatedNode(newNode);
    });
    test('instantiating synced scene node', function () {
        var newNode = cc.instantiate(parent);
        testInstantiatedNode(newNode);
        ok(newNode._prefab.sync === true, "sync should be instantiated");
        ok(newNode._prefab._synced === true, "instantiated node should be _synced");
    });

    test('load and sync scene', function () {
        // prepare dummy scene
        var scene = new cc.Scene();
        scene._inited = false;
        scene.children.push(reloadedParent);
        reloadedParent._parent = scene;

        // invoke sync
        cc.director.runSceneImmediate(scene);

        // test prefabInfo
        var prefabInfo = reloadedParent._prefab;
        ok(prefabInfo, "new node should preserve the prefab info");
        ok(prefabInfo.sync === true, "sync should be instantiated");
        ok(prefabInfo._synced === true, "instantiated node should be _synced");
        strictEqual(prefabInfo.fileId, parent.uuid, 'fileId should be kept');

        // test parent
        strictEqual(reloadedParent.scaleX, parent.scaleX, 'all scale should be synced');
        var comp = reloadedParent.getComponent(cc.Component);
        ok(comp, 'all component should be synced');
        strictEqual(comp.node, reloadedParent, 'component reference should redirect to scene node');
        strictEqual(reloadedParent.x, parent.x, 'root position should be kept');
        strictEqual(reloadedParent.name, parent.name, 'root name should be kept');
        strictEqual(reloadedParent.active, false, 'root active should be kept');
        strictEqual(reloadedParent.children.length, 1, 'children should be synced');

        // test parent sgNode
        strictEqual(reloadedParent._sgNode.parent === scene._sgNode, true, 'parent of parent _sgNode should be synced');

        // test child
        var syncedChild = reloadedParent.children[0];
        strictEqual(syncedChild.active, child.active, 'child active should be synced');
        strictEqual(syncedChild.getComponent(cc.Component) != null, true, 'child component should be synced');
        strictEqual(syncedChild.y, child.y, 'child position should be synced');
        strictEqual(syncedChild.scaleY, child.scaleY, 'child scale should be synced');
        strictEqual(syncedChild.parent, reloadedParent, 'prefab reference should redirect to scene node');

        // test child sgNode
        strictEqual(syncedChild._sgNode.parent === reloadedParent._sgNode, true, 'parent of child _sgNode should be synced');
    });

    //
    //test('re-instantiate an instantiated node', function () {
    //    var first = cc.instantiate(prefab);
    //    var second = cc.instantiate(first);
    //    var secondInfo = second._prefab;
    //
    //    ok(second, "new node should be created");
    //    ok(secondInfo, "new node should preserve the prefab info");
    //    ok(secondInfo !== first._prefab, "prefab info should not the same");
    //    ok(secondInfo.asset === prefab, "should reference to origin prefab asset in prefab info");
    //    ok(secondInfo.root === second, "check root");
    //    ok(secondInfo.fileId === first._prefab.fileId, "check fileId");
    //
    //    notEqual(first.uuid, second.uuid, 'The id of instances should be different');
    //});
    //
    //test('apply node', function () {
    //    var newNode = cc.instantiate(prefab);
    //    var newPrefab = _Scene.PrefabUtils.createAppliedPrefab(newNode);
    //    strictEqual(newPrefab.data._prefab.fileId, prefab.data._prefab.fileId, "fileId should not changed during apply");
    //});
    //
    //asyncTest('revert prefab', function () {
    //    // stub
    //    cc.loader.insertPipe({
    //        id : 'Prefab_Provider',
    //        async : false,
    //        handle : function (item) {
    //            var url = item.id;
    //            if (url === UUID) {
    //                item.states['Downloader'] = cc.Pipeline.ItemState.COMPLETE;
    //                return JSON.stringify(prefabJson);
    //            }
    //            else {
    //                return;
    //            }
    //        }
    //    }, 0);
    //
    //    var testNode = cc.instantiate(prefab);
    //    var testChild = testNode.children[0];
    //
    //    testNode.scale = 0;
    //    testNode.removeComponent(TestScript);
    //    testNode.children[1].parent = null;
    //    testChild.scale = cc.Vec2.ZERO;
    //    testChild.addComponent(TestScript);
    //
    //    var newNode = new cc.Node();
    //    newNode.parent = testChild;
    //
    //    var newNode2 = new cc.Node();
    //    newNode2.parent = testNode;
    //    newNode2.setSiblingIndex(0);
    //
    //    _Scene.PrefabUtils.revertPrefab(testNode, function () {
    //        ok(testNode.getScaleX() === 123 && testNode.getScaleY() === 432, 'Revert property of the parent node');
    //        ok(testNode.getComponent(TestScript).constructor === TestScript, 'Restore removed component');
    //        var c = testNode.children[0];
    //        ok(c.getScaleX() === 22 && c.getScaleY() === 11, 'Revert child node');
    //        ok(testChild.getComponent(TestScript) == null, 'Remove added component');
    //
    //        ok(testNode.getComponent(TestScript).target === testChild, 'Should redirect reference to scene node');
    //
    //        strictEqual(testChild.children.length, 0, 'Should remove new node');
    //
    //        strictEqual(testNode.childrenCount, 2, 'Should create removed node');
    //        var created = testNode.children[1];
    //        ok(created._sgNode, 'Checking created node');
    //
    //        var comp = created.getComponent(MyComponent);
    //        comp.resetExpect(CallbackTester.OnLoad, 'call onLoad while attaching to node');
    //        comp.pushExpect(CallbackTester.OnEnable, 'then call onEnable if node active');
    //
    //        cc.director.getScene().addChild(testNode);
    //
    //        comp.stopTest();
    //
    //        strictEqual(newNode2.isValid, false, 'should remove new node which is not the last sibling');
    //
    //        start();
    //    });
    //});
})();
