class Observer{
	constructor(data) {
	    this.observe(data);
	}
	observe(data){
		if(!data || typeof data !== 'object'){ //劫持的数据类型为对象
			return;
		}
		//要将数据一一劫持 先获取data的key和value Object.keys返回一个数组
		Object.keys(data).forEach( key =>{
			//劫持
			this.defineRective(data,key,data[key]);
			this.observe(data[key]);//深度递归劫持
		})
	}
	
	defineRective(obj,key,value){
		let that = this;
		let dep = new Dep(); //每个变化的数据都会对应一个数组，这个数组是存放所有更新的操作
		Object.defineProperty(obj,key,{
			enumerable:true,
			configurable:true,
			get(){  //当取值时调用的方法
				Dep.target && dep.addSub(Dep.target);
				return value;
			},
			set(newValue){
				if(newValue!=value){
					//这里的this不是实例
					that.observe(newValue);//如果新值是对象，继续劫持
					value = newValue;
					dep.notify();//通知所有 数据更新了
				}
			}
		})
	}
}

class Dep{
	constructor(arg) {
	    this.subs = [];//订阅的数组
	}
	addSub(watcher){
		this.subs.push(watcher);
	}
	notify(){
		this.subs.forEach(watcher=>{
			watcher.update();
		})
	}
}