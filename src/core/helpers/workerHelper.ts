// The worker timer functionality here mirrors the requestAnimationFrame api to make them compatible.

// Creates a worker from a function
const createWorker = (fn: any) => {
    var blob = new Blob(['self.onmessage = ', fn.toString()], { type: 'text/javascript' });
    var url = URL.createObjectURL(blob);

    return new Worker(url);
}

const setWorkerInterval = (callback: () => void) => {
    function workerFn() {
      setInterval(function(){
        postMessage('');
      }, 1000/24) // 24fps
    }
    let worker = createWorker(workerFn);
    worker.onmessage = callback;
    worker.postMessage(''); // start the worker
    return worker;
}

let workerListeners: (()=>void)[] = [];

export const setupWorkerTimer = () => {
    let worker = setWorkerInterval(() => {
        let listenersCopy = workerListeners;
        workerListeners = []; // clear all listeners
        listenersCopy.forEach(callback => callback());
    })
    return worker;
}

export const requestWorkerFrame = (callback: () => void) => {
    let requestId = workerListeners.length;
    workerListeners.push(callback);
    return requestId;
}

export const cancelWorkerFrame = (requestId: number) => {
    workerListeners.splice(requestId, 1);
}


