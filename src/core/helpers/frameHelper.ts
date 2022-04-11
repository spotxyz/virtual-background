// This module is an abstraction over requestAnimationFrame functionality. It toggles between using requestAnimationFrame,
// and using webworkers to ensure the callbacks continue to be triggered when the tab is backgrounded.

import {cancelWorkerFrame, requestWorkerFrame, setupWorkerTimer} from "./workerHelper";

let worker: Worker | null = null;
let useWorker = false;

// Always use requestAnimationFrame on the Spot desktop app since we disable background throttling
const isDesktopApp =
    typeof window !== 'undefined' && window.navigator.userAgent.includes('Spot/');

interface WrappedCallback {callback: () => void, isWorker: boolean}

let pendingCallbacks: {[x: number]: WrappedCallback} = {};

window.addEventListener('blur', () => {
    if(isDesktopApp){
        return; // don't use worker timer on the desktop app
    }

    if(!useWorker){
        useWorker = true;
        console.debug('virtual-background useWorker: '+useWorker);

        if(!worker){
            worker = setupWorkerTimer();
        }

        reRequestPendingCallbacks();
    }
})

window.addEventListener('focus', () => {
    if(isDesktopApp){
        return;
    }

    if(useWorker){
        useWorker = false;

        console.log('virtual-background useWorker: '+useWorker);

        if(worker){
            worker.terminate();
            worker = null;
        }

        reRequestPendingCallbacks();
    }
})



export const requestFrame = (callback: () => void) => {
    let requestId: number = -1;

    let wrappedCallback = () => {
        if(pendingCallbacks[requestId]){
            delete pendingCallbacks[requestId];
            callback();
        }
    }

    requestId = useWorker? requestWorkerFrame(wrappedCallback) : requestAnimationFrame(wrappedCallback);
    pendingCallbacks[requestId] = {callback, isWorker: useWorker};

    return requestId
}

const reRequestPendingCallbacks =() => {
    let prevPendingCallbacks = Object.entries(pendingCallbacks);
    for(let [reqId, wrappedCallback] of prevPendingCallbacks){
        cancelFrame(parseInt(reqId));

        requestFrame(wrappedCallback.callback);
    }
}



export const cancelFrame = (requestId: number) => {
    let wrappedCallback = pendingCallbacks[requestId];
    if(wrappedCallback){
        if(wrappedCallback.isWorker){
            cancelWorkerFrame(requestId);
        }else{
            cancelAnimationFrame(requestId);
        }
        delete pendingCallbacks[requestId];
    }
}