function getElement(id) { try { return document.getElementById(id); } catch(err) { throw err; } };
function isObject(theObject) { return (Object.prototype.toString.call(theObject)=="[object Object]"); }
function isArray(theArray) { return (Object.prototype.toString.call(theArray)=="[object Array]"); }
function setElementAttributes(theElement, theAttributes) {
	if (Object.prototype.toString.call(theAttributes)=="[object Object]") {
		for (var theName in theAttributes) { theElement.setAttribute(theName, theAttributes[theName]);}
	}
}
function addChildElement(eParent, childType, childContent, childAttributes) {
	if (childType=="") {
		if (typeof childContent === "undefined") {
			childContent = " ";
		} else {
			if (childContent=="") throw new Error("addChildElement(): content must be specified for a Text Node");
		}
		if (typeof childAttributes !== "undefined") throw new Error("addChildElement(): attributes cannot be specified for a Text Node");
	}
	var eChild = (childType=="") ? document.createTextNode(childContent) : document.createElement(childType);
	eParent.appendChild(eChild);
	if (childType!="") {
		if (typeof childContent == "string") eChild.innerHTML = childContent;
		if (Object.prototype.toString.call(childAttributes)=="[object Object]") setElementAttributes(eChild, childAttributes);
	}
	return eChild;
}
function addInputAndLabel(eParent,cbAttrs,lblText,lblAttrs) {
	if (!("id" in cbAttrs)) throw new Error("addCheckboxAndLabel(): \"id\" not in cbAttrs");
	if (!isObject(lblAttrs)) lblAttrs = {};
	if (!("for" in lblAttrs)) lblAttrs.for = cbAttrs.id;
	addChildElement(eParent,"input",null,cbAttrs);
	addChildElement(eParent,"label",lblText,lblAttrs);
}
function escapeHTML(html) {
	var eTmp = document.createElement('textarea');
    eTmp.textContent = html;
    return eTmp.innerHTML;
}
function halt(msg) { alert(msg); throw new Error(msg); }
function processElementsByClass(cn,f,b) { /* b = true/false to halt if no elements found */
	if (typeof b !== "boolean") b = true;
	var c=document.getElementsByClassName(cn);
	if (c.length==0 && b) halt("processElementsByClass(): No elements found with class \""+cn+"\"");
	if (typeof f === "function") { for (var i=0; i<c.length; i++) { f(c[i]); } }
	return (c.length==1) ? c[0] : null;
}
function toggleSiblingDisplay(e, b) {
	var display = (typeof b == "boolean") ? b : (e.nextElementSibling.style.display=="none");
	e.nextElementSibling.style.display = (display) ? "" : "none";
	e.firstElementChild.innerHTML = (display) ? "▼" : "▶"; /* &#9660; : &#9654; */
}
function displayDD(p,b) {
	for (var c=p.getElementsByTagName("dt"),i=0; i<c.length; i++) { if (c[i].style.display=="") toggleSiblingDisplay(c[i],b); }
}
function formatArray(parent,key,data) {
	for (var i=0; i<data.length; i++) { data[i] = escapeHTML(data[i]); }
	if (key == "query") {
		var xl = addChildElement(parent,"ol");
		var li = addChildElement(xl,"li");
		addChildElement(li,"pre",data.join("\n"));
	} else {
		var xl = addChildElement(parent,"ol");
		for (var i=0; i<data.length; i++) { addChildElement(xl,"li", data[i]); }
	}
}
function createFormattedOutput(parent,data) {
	var dl = addChildElement(parent,"dl");
	for (var key in data) {
		var dt = addChildElement(dl,"dt");
		dt.onclick = function() { toggleSiblingDisplay(this); };
		addChildElement(dt,"span","?");
		dt.innerHTML += escapeHTML(key);
		if (isObject(data[key])) {
			createFormattedOutput(addChildElement(dl,"dd"),data[key]);
		} else if (isArray(data[key])) {
			var dd = addChildElement(dl,"dd",null,{class:(key.startsWith("/"))?"fields":key});
			formatArray(dd,key,data[key]);
		} else halt("Unknown object type: \""+(typeof data[key])+"\"");
	}
}
var filesRequested = 0, fileData = {}, fields = {}, queries = {}, itemTypes = {};
function getSearchFields(query, breadCrumbs) {
	/* Traverse to end of queries object */
	var tmpQuery = queries;
	for (var i=0; i<breadCrumbs.length; i++) {
		if (!(breadCrumbs[i] in tmpQuery)) tmpQuery[breadCrumbs[i]] = {};
		tmpQuery = tmpQuery[breadCrumbs[i]];
	}
	/* Store query string and fields array */
	tmpQuery.query = query.split("\n");
	tmpQuery.fields = [];
	query.replace(/\| *json *("[^\n^|]+")/g,function(m,g){
		g.replace(/"([^"]+)"/g,function(m,g){ tmpQuery.fields.push(g); });
	});
	tmpQuery.fields.sort();
	/* Iteratively traverse fields object */
	for (var bcPath="", i=0; i<breadCrumbs.length; i++) {
		bcPath += "/" + breadCrumbs[i];
		/* Create new fields array as needed */
		if (!(bcPath in fields)) fields[bcPath] = [];
		/* Store fields array(s) */
		for (var j=0; j<tmpQuery.fields.length; j++) {
			if (!(fields[bcPath].includes(tmpQuery.fields[j]))) fields[bcPath].push(tmpQuery.fields[j]);
		}
		fields[bcPath].sort();
	}
}
function processData(jsonData,breadCrumbs) {
	if (!("name" in jsonData)) throw new Error("Query data item has no name");
	if (!("type" in jsonData)) throw new Error("Query data item \""+jsonData.name+"\" has no type");
	if (jsonData.type == "Folder") {
		if (!("children" in jsonData)) throw new Error("Query data item \""+jsonData.name+"\" has no children");
		for (var i=0; i<jsonData.children.length; i++) {
			breadCrumbs.push(jsonData.name);
			itemTypes["/"+breadCrumbs.join("/")] = jsonData.type;
			processData(jsonData.children[i],breadCrumbs);
			breadCrumbs.pop();
		}
	} else {
		breadCrumbs.push(jsonData.name);
		switch (jsonData.type) {
			case "Search":
				itemTypes["/"+breadCrumbs.join("/")] = jsonData.type;
				getSearchFields(jsonData.searchQuery, breadCrumbs);
				break;
			case "Report":
				itemTypes["/"+breadCrumbs.join("/")] = "Dashboard " + jsonData.type;
				for (var i=0; i<jsonData.panels.length; i++) {
					if (jsonData.panels[i].queryString=="") continue;
					breadCrumbs.push(jsonData.panels[i].name);
					itemTypes["/"+breadCrumbs.join("/")] = "Panel " + jsonData.type;
					getSearchFields(jsonData.panels[i].queryString, breadCrumbs);
					breadCrumbs.pop();
				}
				break;
			default:
				throw new Error("Unknown \"type\" Field Value: \""+jsonData.type+"\"");
		}
		breadCrumbs.pop();
	}
}
function toggleOutputFormat(id) {
	processElementsByClass(id.replace(/_.*$/,"_output"),function(e) {
		if (e.tagName=="BUTTON")
			e.disabled = !(id.includes("html"));
		else
			e.style.display = "none";
	});
	processElementsByClass(id+"_output",function(e) {
		e.style.display = "";
	});
}
function filterFields(cn,b) {
	processElementsByClass(cn,function(e) {
		if (b) {
			switch (e.tagName) {
				case "DT":
					e.style.display = "";
					return;
				case "DD":
					e.style.display = (e.previousSibling.firstElementChild.innerText=="▼") ? "" : "none";
					return;
				default:
					halt("filterFields() - Unexpected TAG \""+e.tagName+"\"");
			}
		} else {
			e.style.display = "none";
		}
	}, false);
}
function addFieldsFilter(eParent) {
	/* Add filter controls */
	var eTmp = document.createElement("span"), id;
	addChildElement(eTmp,"span","Output Filter:&nbsp;");
	addInputAndLabel(eTmp,{id:"cbFieldsFolders",type:"checkbox",checked:"checked",onchange:"filterFields('folder',this.checked)"},
		"Folders&nbsp;");
	addInputAndLabel(eTmp,{id:"cbFieldsDashboardReports",type:"checkbox",checked:"checked",onchange:"filterFields('dashboardReport',this.checked)"},
		"Dashboard Reports&nbsp;");
	addInputAndLabel(eTmp,{id:"cbFieldsPanelReports",type:"checkbox",checked:"checked",onchange:"filterFields('panelReport',this.checked)"},
		"Panel Reports&nbsp;");
	addInputAndLabel(eTmp,{id:"cbFieldsSearches",type:"checkbox",checked:"checked",onchange:"filterFields('search',this.checked)"},
		"Searches&nbsp;");
	eParent.insertBefore(eTmp, eParent.firstChild);
	/* Tag DT and DD elements with the appropriate class names */
	for (var c=getElement("fields_html_output").getElementsByTagName("dt"), i=0; i<c.length; i++) {
		var tmpType = itemTypes[c[i].innerText.substring(1)],
			tmpClass = tmpType.replace(/^./,function(m){return m.toLowerCase();}).replace(/ /g,"");
		addChildElement(c[i],"span","&nbsp;[" + tmpType + "]",{class:"noLink"});
		c[i].className += ((c[i].className=="")?"":" ") + tmpClass;
		c[i].nextElementSibling.className += ((c[i].className=="")?"":" ") + tmpClass;
	}
}
function prepareOutput(id,data) {
	var eId = getElement(id), eDiv;
	eId.innerHTML = "";
;
	addChildElement(eDiv = addChildElement(eId,"div",null,{class:"outputFormat"}),"span","Output Format:");
	addChildElement(eDiv,"input",null,{type:"radio",name:id+"_outputFormat",id:id+"_html",onclick:"toggleOutputFormat(this.id)",checked:"checked"});
	addChildElement(eDiv,"label","HTML",{for:id+"_html"});
	addChildElement(eDiv,"input",null,{type:"radio",name:id+"_outputFormat",id:id+"_json",onclick:"toggleOutputFormat(this.id)"});
	addChildElement(eDiv,"label","JSON",{for:id+"_json"});
	addChildElement(eDiv,"button","Expand All Items",{class:id+"_output",onclick:"displayDD(getElement('"+id+"'),true)"});
	addChildElement(eDiv,"button","Collapse All Items",{class:id+"_output",onclick:"displayDD(getElement('"+id+"'),false)"});
	/*addChildElement(eDiv,"button","Toggle All",{class:id+"_output",onclick:"displayDD(getElement('"+id+"'))"});*/

	createFormattedOutput(addChildElement(eId,"div",null,{class:id+"_output "+id+"_html_output explorer",id:id+"_html_output"}),data);

	addChildElement(eId,"pre",JSON.stringify(data,null,"    "),{class:id+"_output "+id+"_json_output",id:id+"_json_output"});

	displayDD(eId,true); /* Initial state of expand/collapse !!! */
	toggleOutputFormat(id+"_html"); /* Initial type of output displayed !!! */

	if (id=="fields") {
		eDiv = addChildElement(eDiv,"div",null,{class:id+"_output "+id+"_html_output"});
		addFieldsFilter(eDiv);
	}
}
function checkIfJson(e,b) {
	if (typeof b !== "boolean") b = true;
	var goodJSON = false;
	try {
		var eTest = JSON.parse(e.innerText);
		goodJSON = isObject(eTest);
	} catch(err) {
		console.log(err);
	}
	e.style.borderColor = (goodJSON) ? "var(--disabled_gray)" : "red";
	if (b) {  /* Check added to use function for debug data */
		var eRadioButton = e.parentNode.previousSibling.firstElementChild;
		if (eRadioButton.checked && !goodJSON) {
			eRadioButton.checked = false;
			checkMessage();
		}
		eRadioButton.disabled = !goodJSON;
	}
}
function checkMessage(ref) {
	if (typeof ref === "undefined") ref = "-";

	getElement("delesectMessageButton").disabled = (document.querySelector('input[name="logMessage"]:checked')==null);

	var eItem = getElement("itemSelect"), eMsg = getElement("msgList"), eComp = getElement("fieldComp");
	eComp.innerHTML = "";
	var eTr = addChildElement(eComp,"tr",null);
	addChildElement(eTr,"td","Item Field");
	addChildElement(eTr,"td","Message Field");
	addChildElement(eTr,"td","Message Data");

	var messageSelected = (document.querySelector('input[name="logMessage"]:checked')!=null), msgFields = [];
	if (messageSelected) {
		var eMsg = getElement("message_"+document.querySelector('input[name="logMessage"]:checked').value),
			oMsg = JSON.parse(eMsg.innerText);
		msgFields = Object.keys(oMsg);
		msgFields.sort();
	}

	var itemFields = (eItem.value=="") ? [] : fields[eItem.value], allFields = msgFields.slice();
	itemFields.forEach(function(currentValue){if(!(allFields.includes(currentValue)))allFields.push(currentValue);});
	allFields.sort();

	for (var i=0; i<allFields.length; i++) {
		var eTr = addChildElement(eComp,"tr",null);
		eTr.className = (msgFields.includes(allFields[i])&&itemFields.includes(allFields[i])) ? "msgFldFound" : (
			(msgFields.includes(allFields[i])) ? "msgFldExtra" : "msgFldMissing"
		);
		addChildElement(eTr,"td",(itemFields.includes(allFields[i])) ? escapeHTML(allFields[i]) : "-" );
		addChildElement(eTr,"td",(msgFields.includes(allFields[i])) ? escapeHTML(allFields[i]) : "-" );
		addChildElement(eTr,"td",(msgFields.includes(allFields[i])) ? escapeHTML(oMsg[allFields[i]]) : "&nbsp;" );
	}

	for (var c=getElement("compFilters").getElementsByTagName("input"),i=0; i<c.length; i++) {
		if (c[i].type!="checkbox") continue;
		c[i].checked = true;
	}

}
function delMessage(e) {
	e.parentNode.nextElementSibling.remove();
	e.parentNode.remove();
	checkMessage(e.getAttribute("ref"));
	if (document.getElementsByName("logMessage").length==0) processElementsByClass("xAllMessages",function(e){ e.disabled = true; });
}
function deselectMessage(id) {
	var eMsgSelected = document.querySelector('input[name="logMessage"]:checked');
	if (eMsgSelected!=null) eMsgSelected.checked = false;
	getElement("delesectMessageButton").disabled = true;
	checkMessage();
}
function toggleMessage(e,b) {
	if (typeof b !== "boolean") b = (e.innerHTML=="Show Message");
	e.innerHTML = (b) ? "Hide Message" : "Show Message";
	e.parentNode.nextSibling.style.display = (b) ? "" : "none";
}
function toggleMessages(b) {
	processElementsByClass("toggleMessageButton", function(e){ toggleMessage(e,b); });
}
function addMessage(id) {
	var eDl = getElement(id),
		eDt = addChildElement(eDl,"dt"),
		eDd = addChildElement(eDl,"dd"),
		id = Date.now();
	addChildElement(eDt,"input",null,{type:"radio",name:"logMessage",value:id,ref:id,onclick:"checkMessage(this.getAttribute('ref'))",disabled:"disabled"});
	addChildElement(eDt,"");
	addChildElement(eDt,"label","Name (Optional):",{for:"name_"+id});
	addChildElement(eDt,"");
	addChildElement(eDt,"input",null,{type:"text",id:"name_"+id});
	addChildElement(eDt,"");
	addChildElement(eDt,"button","Hide Message",{ref:id,class:"toggleMessageButton",onclick:"toggleMessage(this)"});
	addChildElement(eDt,"");
	addChildElement(eDt,"button","Delete Message",{ref:id,onclick:"delMessage(this)"});
	var eDiv = addChildElement(eDd,"div",null,{contentEditable:"true",spellcheck:"false",class:"textarea",id:"message_"+id,onkeyup:"checkIfJson(this)",style:"border-color:red"});
	processElementsByClass("xAllMessages",function(e){ e.disabled = false; });
	return(eDiv);
}
function filterItems(cn,b) {
	processElementsByClass(cn, function(e) { e.style.display = (b) ? "" : "none"; }, false);
	var eSelect = getElement("itemSelect"), firstDisplayedIndex;
	if (eSelect.disabled) {
		eSelect.disabled = false;
		eSelect.options[0].style.display = "none";
	}
	if (eSelect.options[eSelect.selectedIndex].style.display=="") return;
	for (var i=1; i<eSelect.options.length; i++) {
		if (eSelect.options[i].style.display=="none") continue;
		firstDisplayedIndex = i;
		break;
	}
	if (typeof firstDisplayedIndex == "undefined") {
		eSelect.disabled = true;
		eSelect.options[0].style.display = "";
		firstDisplayedIndex = 0;
	}
	eSelect.selectedIndex = firstDisplayedIndex;
	checkMessage("filterItems");
}
function filterTable(cn,b) {
	processElementsByClass(cn, function(e){ e.style.display = (b) ? "" : "none"; }, false);
}
function prepareCompares() {
	getElement("compares").innerHTML = "";
	var eDl = addChildElement(getElement("compares"),"dl"), eDt, eDiv;
	eDt = addChildElement(eDl,"dt","Messages");
	addChildElement(eDt,"");
	addChildElement(eDt,"button","Deselect Message",{id:"delesectMessageButton",onclick:"deselectMessage('msgList')"});
	addChildElement(eDt,"");
	addChildElement(eDt,"button","Show All Messages",{class:"xAllMessages",disabled:"disabled",onclick:"toggleMessages(true)"});
	addChildElement(eDt,"");
	addChildElement(eDt,"button","Hide All Messages",{class:"xAllMessages",disabled:"disabled",onclick:"toggleMessages(false)"});
	addChildElement(eDt,"");
	addChildElement(eDt,"button","Add Message",{onclick:"addMessage('msgList')"});
	addChildElement(addChildElement(eDl,"dd"),"dl",null,{id:"msgList"});
	/*  */
	eDt = addChildElement(eDl,"dt","Items",null,{id:"itemsFilters"});
	eDiv = addChildElement(eDt,"div");
	addChildElement(eDiv,"span","Filter:&nbsp;");
	addInputAndLabel(eDiv,{id:"cbCompFolders",type:"checkbox",checked:"checked",onchange:"filterItems('itemsFolder',this.checked)"},
		"Folders&nbsp;");
	addInputAndLabel(eDiv,{id:"cbCompDashboardReports",type:"checkbox",checked:"checked",onchange:"filterItems('itemsDashboardReport',this.checked)"},
		"Dashboard Reports&nbsp;");
	addInputAndLabel(eDiv,{id:"cbCompPanelReports",type:"checkbox",checked:"checked",onchange:"filterItems('itemsPanelReport',this.checked)"},
		"Panel Reports&nbsp;");
	addInputAndLabel(eDiv,{id:"cbCompSearches",type:"checkbox",checked:"checked",onchange:"filterItems('itemsSearch',this.checked)"},
		"Searches&nbsp;");
	var eDd = addChildElement(eDl,"dd"),
		eSelect = addChildElement(eDd,"select",null,{id:"itemSelect",onchange:"checkMessage()"});
	addChildElement(eSelect,"option",null,{value:"",style:"display:none"});
	for (var key in fields) {
		addChildElement(eSelect,"option",escapeHTML(key+" ["+itemTypes[key]+"]"),{value:key,class:"items"+itemTypes[key].replace(/ /g,"")});
	}
	eSelect.selectedIndex = 1;
	/*  */
	eDt = addChildElement(eDl,"dt","Comparison");
	eDiv = addChildElement(eDt,"div",null,{id:"compFilters"});
	addChildElement(eDiv,"span","Filter:&nbsp;");
	addInputAndLabel(eDiv,{id:"cbCompMsgFldFound",type:"checkbox",checked:"checked",onchange:"filterTable('msgFldFound',this.checked)"},
		"Matching Fields&nbsp;",{title:"Message Field found in Item Fields"});
	addInputAndLabel(eDiv,{id:"cbCompMsgFldExtra",type:"checkbox",checked:"checked",onchange:"filterTable('msgFldExtra',this.checked)"},
		"Extra Message Fields&nbsp;",{title:"Message Field not found in Item Fields"});
	addInputAndLabel(eDiv,{id:"cbCompMsgFldMissing",type:"checkbox",checked:"checked",onchange:"filterTable('msgFldMissing',this.checked)"},
		"Missing Message Fields&nbsp;",{title:"Item Field not found in Message Fields"});
	addChildElement(addChildElement(eDl,"dd"),"table",null,{id:"fieldComp"});
	checkMessage();
}
function processFiles() {
	fields = {};
	queries = {};
	itemTypes = {};
	var arrFiles = [];
	for (var file in fileData) {
		arrFiles.push("\""+file+"\"");
		console.log("Processing \""+file+"\"");
		var jsonData = {};
		try {
			jsonData = JSON.parse(fileData[file]);
			processData(jsonData,[]);
		} catch(err) {
			alert("Error parsing \""+file+"\"data: "+err.message);
			throw err;
		}
	}
	if (Object.keys(fields).length==0) {
		clearData("No fields found in input file"+((arrFiles.length==1)?"":"s")+": "+arrFiles.join(", "));
		return;
	}
	prepareOutput("fields",fields);
	prepareOutput("queries",queries);
	prepareCompares();
	yam.click("yam_fields");
}
/* https:/* www.html5rocks.com/en/tutorials/file/dndfiles/ */
function handleFileSelect(evt) {
	var files = evt.target.files;
	var output = [];
	filesRequested = files.length;
	for (var i = 0, f; f = files[i]; i++) {
		console.log(
			[
				f.name,
				'('+ (f.type || 'n/a') +')',
				f.size + ' bytes',
				'last modified: '+(f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a'),
			].join(" ")
		);

		(function(file) {
			var reader = new FileReader();
			reader.onloadend = function(e) {
				fileData[reader.name] = reader.result;
				if (Object.keys(fileData).length!=filesRequested) return;
				console.log("Done: "+filesRequested+" files requested; "+Object.keys(fileData).length+" files loaded");
				processFiles();
			};
			reader.name = f.name;
			reader.readAsText(f);
		})(f);
	}
}
function clearData(txtMsg) {
	if (typeof txtMsg === "undefined") txtMsg = "No file imported";
	filesRequested = 0;
	fileData = {};
	fields = {};
	queries = {};
	itemTypes = {};
	processElementsByClass("output",function(e){
		e.innerHTML = "";
		addChildElement(e,"div",txtMsg);
	});
	if (txtMsg != "No file imported") alert(txtMsg);
	yam.click("yam_help");
}
function chooseFiles() {
	clearData();
	getElement('file').click();
}
function insertSvgImages() {
	for (var c=getElement("svgImages").children, i=0; i<c.length; i++) {
		if (!("id" in c[i])) halt("insertSvgImages() - ID attribute not found"+c[i].outerHTML);
		processElementsByClass(c[i].id,function(e){
			var tmpHtml = e.innerHTML;
			e.innerHTML = "";
			addChildElement(e,"strong",tmpHtml);
			addChildElement(e,""," (");
			e.appendChild(c[i].cloneNode(true));
			addChildElement(e,"",")");
		}, false);
	}

}
function init() {
	if (typeof yam === "undefined") throw new Error("\"yam.js\" not loaded");
	yam.init({
		default:"yam_help",
		actions:{
			"yam_importdata":function(){chooseFiles();},
			"yam_fields":"fieldsSection",
			"yam_queries":"queriesSection",
			"yam_compares":"comparesSection",
			"yam_help":"instructionsSection",
			"yam_reload":function(){location.reload();}
		},
		colors:{
			MENU_BGC:"black", MENU_TC:"white",
			BUTTON_BGC:"var(--disabled_gray)", BUTTON_TC:"black",
			HOVER_BUTTON_BGC:"var(--disabled_gray)", HOVER_BUTTON_TC:"white",
			ACTIVE_BUTTON_BGC:"white", ACTIVE_BUTTON_TC:"black",
		}
	});
	if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
		halt('The File APIs are not fully supported in this browser');
	}
	getElement('file').addEventListener('change', handleFileSelect, false);
	insertSvgImages();
	processElementsByClass("instructionStep", function(e){e.click()});
	clearData();
	yam.click("yam_help");
}
