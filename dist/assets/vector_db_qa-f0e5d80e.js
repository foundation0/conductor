import{P as y,C as w,S as _,H as v,L as D,a,__tla as k}from"./index-77360db5.js";import{StuffDocumentsChain as C,__tla as P}from"./combine_docs_chain-12d1409f.js";let i,g=Promise.all([(()=>{try{return k}catch{}})(),(()=>{try{return P}catch{}})()]).then(async()=>{class u{}class c extends u{constructor(t,n=[]){super(),Object.defineProperty(this,"defaultPrompt",{enumerable:!0,configurable:!0,writable:!0,value:void 0}),Object.defineProperty(this,"conditionals",{enumerable:!0,configurable:!0,writable:!0,value:void 0}),this.defaultPrompt=t,this.conditionals=n}getPrompt(t){for(const[n,o]of this.conditionals)if(n(t))return o;return this.defaultPrompt}}function l(e){return e._modelType()==="base_chat_model"}const h=new y({template:`Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.

{context}

Question: {question}
Helpful Answer:`,inputVariables:["context","question"]}),m=`Use the following pieces of context to answer the users question. 
If you don't know the answer, just say that you don't know, don't try to make up an answer.
----------------
{context}`,p=[_.fromTemplate(m),v.fromTemplate("{question}")],b=w.fromPromptMessages(p),d=new c(h,[[l,b]]);function f(e,t={}){const{prompt:n=d.getPrompt(e),verbose:o}=t,r=new D({prompt:n,llm:e,verbose:o});return new C({llmChain:r,verbose:o})}i=class extends a{get inputKeys(){return[this.inputKey]}get outputKeys(){return this.combineDocumentsChain.outputKeys.concat(this.returnSourceDocuments?["sourceDocuments"]:[])}constructor(e){super(e),Object.defineProperty(this,"k",{enumerable:!0,configurable:!0,writable:!0,value:4}),Object.defineProperty(this,"inputKey",{enumerable:!0,configurable:!0,writable:!0,value:"query"}),Object.defineProperty(this,"vectorstore",{enumerable:!0,configurable:!0,writable:!0,value:void 0}),Object.defineProperty(this,"combineDocumentsChain",{enumerable:!0,configurable:!0,writable:!0,value:void 0}),Object.defineProperty(this,"returnSourceDocuments",{enumerable:!0,configurable:!0,writable:!0,value:!1}),this.vectorstore=e.vectorstore,this.combineDocumentsChain=e.combineDocumentsChain,this.inputKey=e.inputKey??this.inputKey,this.k=e.k??this.k,this.returnSourceDocuments=e.returnSourceDocuments??this.returnSourceDocuments}async _call(e,t){if(!(this.inputKey in e))throw new Error(`Question key ${this.inputKey} not found.`);const n=e[this.inputKey],o=await this.vectorstore.similaritySearch(n,this.k),r={question:n,input_documents:o},s=await this.combineDocumentsChain.call(r,t==null?void 0:t.getChild());return this.returnSourceDocuments?{...s,sourceDocuments:o}:s}_chainType(){return"vector_db_qa"}static async deserialize(e,t){if(!("vectorstore"in t))throw new Error("Need to pass in a vectorstore to deserialize VectorDBQAChain");const{vectorstore:n}=t;if(!e.combine_documents_chain)throw new Error("VectorDBQAChain must have combine_documents_chain in serialized data");return new i({combineDocumentsChain:await a.deserialize(e.combine_documents_chain),k:e.k,vectorstore:n})}serialize(){return{_type:this._chainType(),combine_documents_chain:this.combineDocumentsChain.serialize(),k:this.k}}static fromLLM(e,t,n){const o=f(e);return new this({vectorstore:t,combineDocumentsChain:o,...n})}}});export{i as VectorDBQAChain,g as __tla};
