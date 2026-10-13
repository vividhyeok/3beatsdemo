import {chooseAI} from './ai.js';
self.onmessage=({data})=>{try{self.postMessage({id:data.id,plan:chooseAI(data.state,data.difficulty,1)});}catch(error){self.postMessage({id:data.id,error:error.message});}};
