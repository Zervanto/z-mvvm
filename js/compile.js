class Compile {
	constructor(el, vm) {
		this.el = this.isElementNode(el) ? el : document.querySelector(el);
		this.vm = vm;
		if (this.el) {
			//1.先把真实的dom放到内存中 fragment 文档碎片
			let fragment = this.node2fragment(this.el);
			//2.编译 提取想要的元素节点v-model 和文本节点{{}}
			this.compile(fragment);
			//3.把编译好的fragment 放回页面中
			this.el.appendChild(fragment);
		}
	}
	//辅助方法
	isElementNode(node) {
		return node.nodeType === 1;
	}
	isDirective(name) {
		return name.includes('v-');
	}

	//核心方法
	compileElement(node) {
		//v-model
		let attrs = node.attributes;
		Array.from(attrs).forEach(attr => {
			let attrName = attr.name;
			if (this.isDirective(attrName)) { //判断属性名字是不是包含v-
				let expr = attr.value; //去对应的值放到节点中
				//let type = attrName.slice(2);
				let [, type] = attrName.split('-');
				CompileUtil[type](node, this.vm, expr);
			}
		})
		// console.log(attrs)

	}

	compileText(node) {
		//{{}}
		let expr = node.textContent;
		let reg = /\{\{([^}]+)\}\}/g;
		if (reg.test(expr)) {
			//node
			CompileUtil['text'](node, this.vm, expr);
		}
	}

	node2fragment(el) { //将el的内容全部放到内存中
		let fragment = document.createDocumentFragment();
		let firstChild;
		while (firstChild = el.firstChild) {
			fragment.appendChild(firstChild);
		}
		return fragment;
	}

	compile(fragment) {
		//需要递归
		let childNodes = fragment.childNodes;
		Array.from(childNodes).forEach(node => {
			if (this.isElementNode(node)) {
				//元素节点
				//编译元素
				this.compileElement(node);
				this.compile(node);
			} else {
				//编译文本
				this.compileText(node);
			}
		})
		// console.log(childNodes)
	}
}

CompileUtil = {
	getVal(vm, expr) { //获取实例上对应的数据
		expr = expr.split('.');
		return expr.reduce((prev, next) => {
			return prev[next];
		}, vm.$data)
	},
	setVal(vm,expr,value){
		expr = expr.split('.');
		return expr.reduce((prev,next,currentIndex)=>{
			if(currentIndex === expr.length-1){
				return prev[next] =value;
			}
			return prev[next];
		},vm.$data)
	},
	getTextVal(vm,expr){
		return expr.replace(/\{\{([^}]+)\}\}/g,(...arguments)=>{
			return this.getVal(vm,arguments[1]);
		});
	},
	text(node, vm, expr) { //文本处理
		let updateFn = this.updater['textUpdater'];
		//expr {{a}}  {{b}}
		let value = this.getTextVal(vm,expr);
		expr.replace(/\{\{([^}]+)\}\}/g,(...arguments)=>{
			new Watcher(vm,arguments[1],(newValue)=>{
				//如果数据变化了，文本节点需要重新获取依赖的数据
				updateFn && updateFn(node,this.getTextVal(vm,expr)); 
			})
		});		
		updateFn && updateFn(node,value); //如果updateFn存在，才会调用
	},
	model(node, vm, expr) { //输入框处理
		let updateFn = this.updater['modelUpdater'];
		//这里加一个监控
		new Watcher(vm,expr,(newValue)=>{
			updateFn && updateFn(node, this.getVal(vm, expr)); //如果updateFn存在，才会调用
		})
		node.addEventListener('input',(e)=>{
			let newValue = e.target.value;
			this.setVal(vm,expr,newValue);
		})
		updateFn && updateFn(node, this.getVal(vm, expr)); //如果updateFn存在，才会调用
	},
	updater: {
		textUpdater(node, value) { //文本更新
			node.textContent = value;
		},
		modelUpdater(node, value) { //输入框更新
			node.value = value;
		}
	}
}
