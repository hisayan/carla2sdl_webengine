import sdl_manifest from '../manifest.js';

// function atob(str) {
//     return Buffer.from(str.replace(/^.*,/, ""), "base64").toString("binary");
// }

function base64ToUint8Array(base64Str) {
    const raw = atob(base64Str);
    return Uint8Array.from(
        Array.prototype.map.call(raw, x => {
            return x.charCodeAt(0);
        })
    );
}

class Carla2SDL {

    _updating = false;

    _current_params = {
        "accPedalPosition": "-",
        "bodyInformation": {
            "parkBrakeActive": "-"
        },
        "driverBraking": "-",

        "gps": {
            "compassDirection": "-",
            "heading": "-",
            "latitudeDegrees": "-",
            "longitudeDegrees": "-",
            "speed": "-",
            "utcDay": "--",
            "utcHours": "--",
            "utcMinutes": "--",
            "utcMonth": "--",
            "utcSeconds": "--",
            "utcYear": "----"
        }
        , "headLampStatus": {
            "highBeamsOn": "-",
            "lowBeamsOn": "-"
        },
        "prndl": "-",
        "speed": "-",
        "steeringWheelAngle": "-",
        "turnSignal": "-"
    };

    constructor() {
        const fileName = `${sdl_manifest.appId}_icon`;
        const file = new SDL.manager.file.filetypes.SdlFile()
            .setName(fileName)
            .setFilePath(sdl_manifest.appIcon)
            .setType(SDL.rpc.enums.FileType.GRAPHIC_PNG)
            .setPersistent(true);

        this._lifecycleConfig = new SDL.manager.LifecycleConfig()
            .loadManifest(sdl_manifest)
            .setLanguageDesired(SDL.rpc.enums.Language.EN_US)
            .setTransportConfig(new SDL.transport.WebSocketClientConfig());

        this._appConfig = new SDL.manager.AppConfig()
            .setLifecycleConfig(this._lifecycleConfig);

        const managerListener = new SDL.manager.SdlManagerListener();
        managerListener
            .setOnStart((sdlManager) => {
                this._onConnected();
            })
            .setOnError((sdlManager, info) => {
                console.error('Error from SdlManagerListener: ', info);
            });

        this._sdlManager = new SDL.manager.SdlManager(this._appConfig, managerListener);
        this._sdlManager
            .start()
            .addRpcListener(SDL.rpc.enums.FunctionID.OnHMIStatus, this._onHmiStatusListener.bind(this));
    }

    _updateParams(result) {
        if (result.getAccPedalPosition() !== null) this._current_params.accPedalPosition = result.getAccPedalPosition();

        const bodyInfo = result.getBodyInformation();
        if (bodyInfo !== null) {
            if (bodyInfo.getParkBrakeActive() !== null) this._current_params.bodyInformation.parkBrakeActive = bodyInfo.getParkBrakeActive()
        }

        if (result.getDriverBraking() !== null) this._current_params.driverBraking = result.getDriverBraking();

        const gps = result.getGps();
        if (gps !== null) {
            if (gps.getLatitudeDegrees() !== null) this._current_params.gps.latitudeDegrees = gps.getLatitudeDegrees();
            if (gps.getLongitudeDegrees() !== null) this._current_params.gps.longitudeDegrees = gps.getLongitudeDegrees();
            if (gps.getHeading() !== null) this._current_params.gps.heading = gps.getHeading();
            if (gps.getCompassDirection() !== null) this._current_params.gps.compassDirection = gps.getCompassDirection();
            if (gps.getSpeed() !== null) this._current_params.gps.speed = gps.getSpeed();
            if (gps.getUtcYear() !== null) this._current_params.gps.utcYear = gps.getUtcYear();
            if (gps.getUtcMonth() !== null) this._current_params.gps.utcMonth = gps.getUtcMonth();
            if (gps.getUtcDay() !== null) this._current_params.gps.utcDay = gps.getUtcDay();
            if (gps.getUtcHours() !== null) this._current_params.gps.utcHours = gps.getUtcHours();
            if (gps.getUtcMinutes() !== null) this._current_params.gps.utcMinutes = gps.getUtcMinutes();
            if (gps.getUtcSeconds() !== null) this._current_params.gps.utcSeconds = gps.getUtcSeconds();
        }

        const headLampStatus = result.getHeadLampStatus();
        console.log(headLampStatus);
        if (headLampStatus !== null) {
            if (headLampStatus.getHighBeamsOn() !== null) this._current_params.headLampStatus.highBeamsOn = headLampStatus.getHighBeamsOn();
            if (headLampStatus.getLowBeamsOn() !== null) this._current_params.headLampStatus.lowBeamsOn = headLampStatus.getLowBeamsOn();
        }

        if (result.getPrndl() !== null) this._current_params.prndl = result.getPrndl();
        if (result.getSpeed() !== null) this._current_params.speed = result.getSpeed();
        if (result.getSteeringWheelAngle() !== null) this._current_params.steeringWheelAngle = result.getSteeringWheelAngle();
        if (result.getTurnSignal() !== null) this._current_params.turnSignal = result.getTurnSignal();
        console.log(this._current_params);

    }

    async _updateCanvas() {
        const screenManager = this._sdlManager.getScreenManager();
        screenManager.beginTransaction();

        const imgData = drawCanvas(this._current_params);

        const sdlArtwork = new SDL.manager.file.filetypes.SdlArtwork(
            "mainBoard",
            SDL.rpc.enums.FileType.GRAPHIC_PNG,
            base64ToUint8Array(imgData.split(',')[1]),
            false
        );
        const success1 = await this._sdlManager
            .getFileManager()
            .uploadFile(sdlArtwork);

        screenManager.setPrimaryGraphic(sdlArtwork);

        const success = await screenManager.commit().catch(function (error) {
            // Handle Error
            console.log(error);
        });
        console.log('ScreenManager update complete:', success);
        if (success === true) {
            // Update complete
        } else {
            // Something went wrong
        }
    }

    async _onConnected() {
        this._updateCanvas()
    }

    async _onHmiStatusListener(onHmiStatus) {
        const hmiLevel = onHmiStatus.getHmiLevel();
        this._logPermissions();

        const screenManager = this._sdlManager.getScreenManager();

        // wait for the FULL state for more functionality
        if (hmiLevel === SDL.rpc.enums.HMILevel.HMI_FULL) {

            // Layout
            const templateConfiguration = new SDL.rpc.structs.TemplateConfiguration();
            templateConfiguration.setTemplate(SDL.rpc.enums.PredefinedLayout.LARGE_GRAPHIC_ONLY);
            const show = new SDL.rpc.messages.Show();
            show.setTemplateConfiguration(
                templateConfiguration
            );
            await this._sdlManager
                .sendRpc(show)
                .then((result) => {
                    console.log('show success', result);
                })
                .catch(function (error) {
                    // Handle Error
                    console.log('show error', error);
                });

            // Menu ... The SDL JavaScript Suite currently does not support the MenuManager. This will be addressed in a future release.
            // const addSubMenu = new SDL.rpc.messages.AddSubMenu()
            //     .setMenuID(1)
            //     .setPosition(0)
            //     .setMenuName("hoge")
            //     .setMenuLayout(SDL.rpc.enums.MenuLayout.TILES)
            // await this._sdlManager
            //     .sendRpc(addSubMenu)
            //     .then((result) => {
            //         console.log('addSubMenu success', result);
            //     })
            //     .catch(function (error) {
            //         // Handle Error
            //         console.log('addSubMenu error', error);
            //     });                

            // 速度の変化を取得するリスナーを定義
            this._sdlManager.addRpcListener(
                SDL.rpc.enums.FunctionID.OnVehicleData,
                onVehicleDataNotification => {
                    this._updateParams(onVehicleDataNotification);
                    this._updateCanvas();
                }
            );

            // 初期値を取得
            const getVehicleDataRequest = new SDL.rpc.messages.GetVehicleData()
                .setAccPedalPosition(true)
                .setBodyInformation(true)
                .setSteeringWheelAngle(true)
                .setDriverBraking(true)
                .setGps(true)
                .setHeadLampStatus(true)
                .setPrndl(true)
                .setSpeed(true)
                .setTurnSignal(true);

            await this._sdlManager
                .sendRpc(getVehicleDataRequest)
                .then((result) => {
                    console.log('GetVehicleData success');
                    if (!this._updating) {
                        this._updating = true;
                        this._updateParams(result);
                        this._updateCanvas();
                        this._updating = false;
                    }
                })
                .catch(function (error) {
                    // Handle Error
                    console.log(error);
                });

            // 変化を取得開始
            const subscribeRequest = new SDL.rpc.messages.SubscribeVehicleData()
                .setAccPedalPosition(true)
                .setBodyInformation(true)
                .setSteeringWheelAngle(true)
                .setDriverBraking(true)
                .setGps(true)
                .setHeadLampStatus(true)
                .setPrndl(true)
                .setSpeed(true)
                .setTurnSignal(true);
            await this._sdlManager
                .sendRpc(subscribeRequest)
                .then((result) => {
                    console.log("Successfully subscribed to vehicle data.");
                    console.log('success', result);
                })
                .catch((error) => {
                    console.log("Successfully subscribed to vehicle data.");
                    console.log(error);
                });

            // tear down the app
            // await this._sdlManager.sendRpc(new SDL.rpc.messages.UnregisterAppInterface());

            // this._sdlManager.dispose();
        }
    }

    _logPermissions() {
        if (this._permissionManager) {
            console.log(`Show RPC allowed: ${this._permissionManager.isRpcAllowed(SDL.rpc.enums.FunctionID.Show)}`);
            console.log(`PutFile RPC allowed: ${this._permissionManager.isRpcAllowed(SDL.rpc.enums.FunctionID.PutFile)}`);
            console.log(`GetVehicleData RPC allowed: ${this._permissionManager.isRpcAllowed(SDL.rpc.enums.FunctionID.GetVehicleData)}`);
            console.log(`SubscribeVehicleData RPC allowed: ${this._permissionManager.isRpcAllowed(SDL.rpc.enums.FunctionID.SubscribeVehicleData)}`);
        }
    }

}

console.log('start app');
const app = new Carla2SDL();