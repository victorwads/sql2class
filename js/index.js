//Origin Idea code - http://tools.knowledgewalls.com/mysqltabletojavaclass
window.onload = function(){

	var input = document.getElementById('input');
	var tabOutputButton = document.getElementById('btn-output');
	var cardsList = document.getElementById('java-cards-list');
	var sqlCodeView = document.getElementById('sql-code');
	var downloadAll = document.getElementById('btn-download-all');
	var LastSql = "";

	downloadAll.addEventListener('click', function (){
		javaZipCode.generateAsync({type:"blob"}).then(function (blob) {
			saveAs(blob, "javaClasses.zip");
		});
	});

	var worker = new Worker('./js/workerCodeHighlight.js');
	worker.addEventListener('message', function (event){
		sqlCodeView.innerHTML = event.data;
		if(event.data === ""){
			sqlCodeView.parentElement.style.opacity = 0;
		}else{
			sqlCodeView.parentElement.style.height = 'auto';
			sqlCodeView.parentElement.style.opacity = 1;
		}
	});

	sqlCodeView.parentElement.addEventListener('transitionend', function (e){
		if(e.propertyName === "opacity" && this.style.opacity === 0){
			sqlCodeView.parentElement.style.height = '0px';
			sqlCodeView.innerHTML = '';
		}
	});


	input.addEventListener('keyup', function(){
		if(LastSql === input.value.trim())
			return;
		LastSql = input.value.trim();
		worker.postMessage(LastSql);
		sqlCodeView.parentElement.style.opacity = 0;
	});

	tabOutputButton.addEventListener('click', function (){
		var SQL = input.value.split(';');
		var element;
		cardsList.innerHTML = '';
		javaZipCode = new JSZip();

		var hasClasses = false;
		for(var i in SQL){
			if(SQL[i].trim() !== "" && (element = processaTable(SQL[i])) !== null){
				cardsList.appendChild( element );
				hljs.highlightBlock( element );
				hasClasses = true;
			}
		}

		if(hasClasses){
			downloadAll.style.display = '';
		}else{
			downloadAll.style.display = 'none';
			element = document.createElement('div');
			element.className = 'mdl-cell mdl-cell--12-col mdl-card mdl-shadow--2dp card-java';
			element.innerHTML =
			'<div>' +
				'<h6 class="mdl-cell mdl-cell--10-col"><i class="material-icons">error</i> Sem conteúdo</h6>' +
			'</div>' +
			'<pre><code class="java">O Bloco SQL de entrada não resultou em nenhum conteúdo. Tente com outro bloco de código SQL.</code></pre>';
			cardsList.appendChild( element );
		}
	});
};
var javaZipCode;
function processaTable(SQL){
	var SQLTratado = ""+SQL;
	SQLTratado = SQLTratado.replace(/[\r\n]/g,"");
	SQLTratado = SQLTratado.replace(/  /g," ");
	SQLTratado = SQLTratado.replace(/  /g," ");
	SQLTratado = SQLTratado.replace(/  /g," ");
	SQLTratado = SQLTratado.replace(/  /g," ");
	SQLTratado = SQLTratado.replace(/`/g,"");

	var datatypeInfo = {
		VARCHAR: "String",
		CHAR: "char",
		INT: "int",
		LONG: "int",
		BIGINT: "int",
		FLOAT: "double",
		DOUBLE: "double",
		DECIMAL: "double",
		BLOB: "Blob",
		LONGBLOB: "Blob",
		MEDIUMBLOB: "Blob",
		TINYBLOB: "Blob",
		DATE: "Date",
		TIMESTAMP: "Date"
	};

	var SQLArray = SQLTratado.match(/('[^']+'|[^,]+)/g);
	var table_name = "";
	var fields = new Array();

	//console.log(SQLArray);

	for (var dataIndex in SQLArray){
		var data = SQLArray[dataIndex].trim().split(" ");

		var field_name = data[0].trim().toUpperCase();
		var type_name = data[1] === undefined ? "" : data[1].split("(")[0].trim().toUpperCase();

		if (field_name == "CREATE" && type_name.toUpperCase() == "TABLE")
			table_name = data[2].trim();

		if (datatypeInfo[type_name] !== undefined){
			fields[fields.length] = {
				name: toTitleCase(field_name).descapitalize(),
				type: datatypeInfo[type_name]
			};
		}
	}

	if (table_name != "(" && table_name !== undefined && table_name !== "" && fields.length !== 0){
		var className = toTitleCase(table_name);
		var javaString = "public class " + className + " {\n";
		var index;
		for (index in fields){
			javaString += "\tprivate "+fields[index].type+" "+fields[index].name+";\n";
		}

		var hasBlob = false;
		var hasDate = false;

		for (index in fields){
			if(fields[index].type === datatypeInfo.BLOB)
				hasBlob = true;
			else if(fields[index].type === datatypeInfo.DATE)
				hasDate = true;

			javaString += "\n\tpublic "+fields[index].type+" get"+fields[index].name.capitalize()+"(){\n";
			javaString += "\t\treturn "+fields[index].name+";\n";
			javaString += "\t}\n";

			javaString += "\n\tpublic void set"+fields[index].name.capitalize()+"("+fields[index].type+" "+fields[index].name+"){\n";
			javaString += "\t\tthis."+fields[index].name+" = "+fields[index].name+";\n";
			javaString += "\t}\n";
		}
		javaString += "}";

		javaString = "package model;\n\n"+
		(hasBlob ? "import java.sql.Blob;\n" : "") +
		(hasDate ? "import java.util.Date;\n" : "") +
		"\n" + javaString;

		return createJavaClass(className, javaString);
	} else {
		return null;
	}
}
function createJavaClass(className, javaCode){
	var element = document.createElement('div');
	element.className = 'mdl-cell mdl-cell--12-col mdl-card mdl-shadow--2dp card-java';
	element.innerHTML =
	'<div>' +
	'<h6 class="mdl-cell mdl-cell--10-col">' + className + '.java</h6>' +
	'<a href="data:text/java;charset=utf-8,' + encodeURIComponent(javaCode) + '" download="' + className + '.java">' +
	'<button class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect">' +
	'Download <i class="material-icons">file_download</i>' +
	'</button>' +
	'</a>' +
	'</div>' +
	'<pre><code class="java">' + javaCode + '</code></pre>';
	javaZipCode.file('model/' + className + '.java', javaCode);
	return element;
}
function toTitleCase(str) {
	return str.toLowerCase().replace(/[a-z]*/g, function(txt){
		return txt.capitalize();
	}).replace(/[^a-zA-Z]/g,"");
}
String.prototype.capitalize = function (){
	return this.charAt(0).toUpperCase() + this.substr(1);
};
String.prototype.descapitalize = function (){
	return this.charAt(0).toLowerCase() + this.substr(1);
};
