import * as tf from '@tensorflow/tfjs'
import { useEffect, useState } from 'react'

// Custom hook to replace useBodyPix since we don't use that
export default function useTensorflow(){
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        async function loadTf (){
            await tf.ready();
            setLoaded(true);
        }
        loadTf();
    }, []);

    return loaded;
}