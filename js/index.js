window.onload = function(){

	var input = document.getElementById('input');
	var tabOutputButton = document.getElementById('btn-output');
	var cardsList = document.getElementById('java-cards-list');

	tabOutputButton.addEventListener('click', function (){
		var SQL = input.value.split(';');
		cardsList.innerHTML = '';
		for(var i in SQL)
			if(SQL[i].trim() !== "")
				cardsList.appendChild( processaTable(SQL[i]) );
	});
};
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

	for (var dataIndex in SQLArray){
		if (!(SQLArray[dataIndex].trim().startsWith("PRIMARY KEY") || SQLArray[dataIndex].trim().startsWith("FULLTEXT KEY") || SQLArray[dataIndex].trim().startsWith("UNIQUE KEY"))){
			var data = SQLArray[dataIndex].trim().split(" ");
			var field_name = data[0].trim();
			var type_name = "";

			if (data[1] !== undefined){
				if (data[1].indexOf("(") != -1){
					type_name = data[1].split("(")[0].trim();
				}
				else {
					type_name = data[1].trim();
				}
			}

			if (field_name.toUpperCase() == "CREATE" && type_name.toUpperCase() == "TABLE"){
				table_name = data[2].trim();
			}

			if (datatypeInfo[type_name.toUpperCase()] !== undefined){
				type_name = datatypeInfo[type_name.toUpperCase()];

				var fields_info = {};
				fields_info.name = field_name;
				fields_info.type = type_name;

				fields[fields.length] = fields_info;
			}
		}
	}

	if (table_name != "(" && table_name !== undefined && table_name !== "" && fields.length !== 0){
		var className = toTitleCase(table_name);
		var javaString = "Class " + className + "{\n";
		var index;
		for (index in fields){
			javaString += "\tprivate "+fields[index].type+" "+fields[index].name+";\n";
		}

		for (index in fields){
			javaString += "\n\tpublic "+fields[index].type+" get"+toTitleCase(fields[index].name)+"(){\n";
			javaString += "\t\treturn "+fields[index].name+";\n";
			javaString += "\t}\n";

			javaString += "\n\tpublic void set"+toTitleCase(fields[index].name)+"("+fields[index].type+" "+fields[index].name+"){\n";
			javaString += "\t\tthis."+fields[index].name+"="+fields[index].name+";\n";
			javaString += "\t}\n";
		}
		javaString += "}";

		return createJavaClass(className, javaString);
	} else {
		return createJavaClass("Error no comando SQL", SQL.trim());
	}
}
function createJavaClass(className, javaCode){
	var element = document.createElement('div');
	element.className = 'mdl-cell mdl-cell--12-col mdl-card mdl-shadow--2dp card-java';
	element.innerHTML =
	'<div>' +
		'<h6 class="mdl-cell mdl-cell--10-col">' + className + '.java</h6>' +
		'<a href="data:text/java;charset=utf-8,' + encodeURIComponent(javaCode) + '" download="' + className + '.java">' +
			'<button class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent">Download</button>' +
		'</a>' +
	'</div>' +
	'<pre>' + javaCode + '</pre>';
	return element;
}
function toTitleCase(str) {
	return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}
//encodeURIComponent();