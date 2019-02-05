var yam = {
	id:"yam",
	class:"button",
	active_button:null,
	last_active_button:null,
	buttons:{},
	actions:{},
	colors:{
		MENU_BGC:"white", MENU_TC:"purple",
		BUTTON_BGC:"white", BUTTON_TC:"black",
		HOVER_BUTTON_BGC:"black", HOVER_BUTTON_TC:"white",
		ACTIVE_BUTTON_BGC:"yellow", ACTIVE_BUTTON_TC:"red"
	},
	styles:[
		"{display: table; background-color: var(--MENU_BGC); color: var(--MENU_TC)}",
		"li,",
		"span {display:table-cell; padding: 0.25em 0.5em; margin: 0 10em; border: 3px solid var(--MENU_BGC); border-radius: 6px; white-space: nowrap; font-weight: bold;}",
		"li.button {cursor: pointer;}",
		"li.button {color: var(--BUTTON_TC); background-color: var(--BUTTON_BGC);}",
		"li.button:hover {color: var(--HOVER_BUTTON_TC); background-color: var(--HOVER_BUTTON_BGC);}",
		"li.button_active,",
		"li.button_active:hover {color: var(--ACTIVE_BUTTON_TC); background-color: var(--ACTIVE_BUTTON_BGC); cursor: default;}",
		"span.spacer {width: 100%;}",
	],
	display: function(cn,v) { for (var c=document.getElementsByClassName(cn),i=0; i<c.length; i++) { c[i].style.display = v; } },
	click: function(b) {
		/* console.log(b); */
		if (typeof this.actions[b] === "function") {
			this.actions[b]();
			this.buttons[this.last_active_button].focus();
			return;
		}
		if (this.last_active_button!=null) {
			if (this.last_active_button==b) return;
			this.buttons[this.last_active_button].className = this.class;
			this.display(this.actions[this.last_active_button],"none");
		}
		this.last_active_button = b;
		this.buttons[this.last_active_button].className = this.class + "_active";
		this.display(this.actions[b],"");
	},
	createStyles:function(customColors) {
		if (typeof customColors === "object") {
			for (var c in customColors) {
				if (!(c in this.colors)) 
					throw new Error("Unknown color variable specified in colors: \""+c+"\"");
				this.colors[c] = customColors[c];
			}
		}
		var e = document.createElement("style");
		for (var i=0; i<this.styles.length; i++) {
			e.innerHTML += "#" + yam.id + " " + this.styles[i].replace(/var\(--([^)]+)\)/g,function(m,g){
				if (!(g in yam.colors)) 
					throw new Error("Unknown color variable specified in styles: \""+g+"\"");
				return yam.colors[g];
			});
		}
		document.getElementsByTagName("head")[0].appendChild(e);
	},
	init:function(settings) {
		this.createStyles(("colors" in settings)?settings.colors:"");
		var e = document.getElementById(this.id);
		if (!e) throw new Error("Menu element with ID=\""+this.id+"\" not found");
		var c = e.getElementsByTagName("li");
		if (c.length==0) throw new Error("No LI elements found");
		for (var i=0; i<c.length; i++) {
			c[i].className=this.class;
			c[i].onclick = function() { yam.click(this.id); };
			this.buttons[c[i].id] = c[i];
		}
		for (var b in settings.actions) {
			if (b in this.buttons) continue;
			throw new Error("Action specified for unknown button: \""+b+"\"");
		}
		for (var b in this.buttons) {
			if (!(b in settings.actions))
				throw new Error("No action specified for button \""+b+"\"");
			if (typeof settings.actions[b] === "string") {
				if (document.getElementsByClassName(settings.actions[b]).length==0) 
					throw new Error("No elements with CLASS=\""+settings.actions[b]+"\" found");
				this.display(settings.actions[b],"none");
			} else if (typeof settings.actions[b] !== "function") {
				throw new Error("Action specified for button \""+b+"\" must be either a string or function");
			}
			this.actions[b] = settings.actions[b];
		}
		if ("default" in settings) {
			if (!(settings.default in this.buttons))
				throw new Error("Default button in settings (\""+settings.default+"\") not found");
			if (typeof settings.actions[settings.default] === "function")
				throw new Error("Action for default button in settings (\""+settings.default+"\") cannot be a function");
			this.click(settings.default);
			this.buttons[settings.default].focus();
		}
	}
}
