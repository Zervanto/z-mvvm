class MVVM{
	constructor(options) {  //将参数挂载到mvvm实例上
	    this.$el = options.el;
		this.$data = options.data;
		if(this.$el){
			new Observer(this.$data); //新建观察者实例
			new Compile(this.$el,this); // 编译模板
		}
	}
}


class Observer{
	constructor(data) {
	    this.observe(data);
	}
	//内部观察者方法实现对数据的劫持
	observe(data){
		if(!data || typeof data !== 'Object'){
			return;
		}
		Object.keys(data).forEach(key=>{
			this.defineRective(data,key,data[key]); 
			this.observe(data[key]); //深度劫持
		})
	}
	//对象的劫持方法 劫持每一个obj的属性值key
	defineRective(obj,key,value){
		let that = this;
		let dep = new Dep();
		//使用Object.defineProperty(obj, prop, descriptor)重新定义被观察数据对象的get和set方法 
		Object.defineProperty(obj,key,{
			get(){
				Dep.target && dep.addSub(Dep.target);
				return value;
			},
			set(newValue){
				if(value != newValue){
					that.observe(newValue); //新的值可能是对象，需要继续劫持
					value = newValue;
					dep.notify(); //通知更新
				}
			}
		});
	}
}

class Dep{
	constructor(arg) {
	    this.subs = []; //订阅数组
	}
	addSub(watcher){
		this.subs.push(watcher);
	}
	notify(){
		this.subs.forEach(watcher => {
			watcher.update();
		})
	}
}

class Watcher{
	constructor(vm,expr,callback){
		this.vm = vm;
		this.expr = expr;
		this.callback = callback;
		this.value = this.get();
	}
	get(){
		Dep.target = this;
		let value = this.getVal(this.vm,this.expr);
		Dep.target = null;
		return value;
	}
	getVal(vm,expr){
		expr = expr.split('.');
		return expr.reduce((prev,next) => {
			return prev[next];
		},vm.$data)					
	}
	update(){
		let newValue = this.getVal(this.vm,this.expr);
		let oldValue = this.value;
		if(newValue != oldValue){
			this.callback(newValue);
		}
	}
}

class Compile{ 
	constructor(el,vm) {
	    this.el = this.isElementNode(el) ? el : document.querySelector(el); 
		this.vm = vm;
		if(this.el){
			let fragment = this.createFragment(this.el); //
			this.compile(fragment);
			this.el.appendChild(fragment);
		}
	}
	//判断是否为元素节点
	isElementNode(node){
		return node.nodeType === 1;
	}
	//判断是否为指令
	isDirective(str){
		return str.includes('z-');//str.includes() 返回布尔值，表示是否找到了参数字符串
	}
	//把dom转换成文档碎片 全部放到内存中
	createFragment(el){
		let _fragment = document.createDocumentFragment();
		let _firstChild;			
		while(_firstChild = el.firstChild){
			_fragment.appendChild(_firstChild);			
		}			
		return _fragment;
	}
	//编译文档碎片
	compile(fragment){
		let childNodes = fragment.childNodes;
		Array.from(childNodes).forEach(node =>{
			if(this.isElementNode(node)){
				this.compileElement(node);
				this.compile(node);
			}else{
				this.compileText(node);
			}
		})
	}
	//编译元素节点
	compileElement(node){
		let attrs = node.attributes;
		Array.from(attrs).forEach(attr=>{
			let attrName = attr.name;
			if(this.isDirective(attrName)){ //判断是不是指令
				let directiveValue = attr.value;   //取指令的值
				let directiveTpye = attrName.split('-')[1];
				CompileUtil[directiveTpye](node, this.vm, directiveValue);
			}
			
		});
		
	}
	//编译文本节点
	compileText(node){
		let text = node.textContent;
		console.log(text);
		CompileUtil.text(node,this.vm,text);
	}
}

var CompileUtil = {
	model(node, vm , expr){
		let _update = this.updater.modelUpdater;
		new Watcher(vm,expr,(newValue)=>{
			_update && _update(node, this.getVal(vm,expr));
		});
		node.addEventListener('input',e=>{
			let _newValue = e.target.value;
			this.setVal(vm,expr,_newValue);
		})
		//更新指令里面的数据
		_update && _update(node, this.getVal(vm,expr));
	},
	getVal(vm,expr){
		expr = expr.split('.'); //z-model = "message.a"
		return expr.reduce((prev,next)=>{
			return prev[next];
		},vm.$data);
	},
	setVal(vm,expr,value){
		expr = expr.split('.'); //expr可能是对象
		return expr.reduce((prev,next,currentIndex)=>{
			if(currentIndex === expr.length-1){
				return prev[next] = value;
			}
			return prev[next];
		},vm.$data);
	},
	text(node,vm,expr){
		let _update = this.updater.textUpdater;
		let _text = this.getText(vm,expr);
		expr.replace(/\{\{([^}]+)\}\}/g,(...arguments)=>{
			new Watcher(vm,arguments[1],(newValue)=>{
				_update && _update(node, this.getText(vm,expr));
			});
		});	
		_update && _update(node,_text);
	},
	getText(vm,expr){ //取出{{}}里面的数据
		return expr.replace(/\{\{([^}]+)\}\}/g, (...arguments)=>{
			return this.getVal(vm,arguments[1]);
		})
	},
	updater:{
		modelUpdater(node,value){
			node.value = value;
		},
		textUpdater(node,value){
			node.textContent = value;
		}
	}
}