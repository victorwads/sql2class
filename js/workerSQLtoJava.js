importScripts('highlight.pack.js');

String.prototype.camelCase = function () {
	return this.replace(/([A-Z])/g,"_$1").toLowerCase().replace(/[a-z]*/g, function(txt){
		return txt.capitalize();
	}).replace(/[^a-zA-Z]/g,"");
};
String.prototype.capitalize = function (){
	return this.charAt(0).toUpperCase() + this.substr(1);
};
String.prototype.descapitalize = function (){
	return this.charAt(0).toLowerCase() + this.substr(1);
};

var collumnRegex = /(\w+)\s+(\w+)[^,]*,?/;
var nameTableRegex = /(alter|create)\s+table\s+(\w+)/i;
var createTableRegex = /(alter|create)\s+table(.*)?\s+(\w+)\s*\(\s*(.*\n)*\s*\)/i;
var createTableRegex = /(alter|create)\s+table\s+(\w+)\s*\(\s*(.*)\s*\)/i;

var foreignKeyRegex = /foreign\s+key\s*\(([\w,]*)\)\s*references\s+(\w*)\s*\(([\w,]*)\)/i;
var foreignKeysRegex = /foreign\s+key\s*\(([\w,]*)\)\s*references\s+(\w*)\s*\(([\w,]*)\)/ig;
var noUseCharactersRegex = /[\r\n`\[\]]/g;
var doubleSpacesRegex = /  /g;
var commentsRegex = /--.*\n|\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\//g;

var datatypeInfo = {
	TEXT: "String",
	VARCHAR: "String",
	CHAR: "String",
	CHARACTER: "String",
	SET: "String",
	MULTISET: "String",
	BOOLEAN: "boolean",
	SMALLINT: "int",
	TINYINT: "int",
	INT: "int",
	INTEGER: "int",
	NUMERIC: "int",
	INTERVAL: "int",
	BIGINT: "long",
	LONG: "long",
	REAL: "float",
	FLOAT: "float",
	DOUBLE: "double",
	DECIMAL: "double",
	BINARY: "byte[]",
	VARBINARY: "byte[]",
	TIME: "java.util.Date",
	DATE: "java.util.Date",
	DATETIME: "java.util.Date",
	TIMESTAMP: "java.util.Date",
	BLOB: "java.sql.Blob",
	LONGBLOB: "java.sql.Blob"
};

function processSQL(SQL){

	var tables = {};
	var foreignKeys = {};

	SQLTratado = SQL;
	SQLTratado = SQLTratado.replace(commentsRegex,"");
	SQLTratado = SQLTratado.replace(noUseCharactersRegex,"");
	while( doubleSpacesRegex.test(SQLTratado) && (SQLTratado = SQLTratado.replace(doubleSpacesRegex," ")) );

	var commands = SQLTratado.split(';');
	var command, regexResult;
	var tableName;

	for(var i in commands){
		if( (command = commands[i].trim()) !== ""){

			regexResult = command.match(createTableRegex);
			if( regexResult !== null ){
				tables[ regexResult[2].camelCase() ] = processFields( regexResult[3] );
			}

			regexResult = command.match(foreignKeysRegex);
			for(var f in regexResult){
				tableName = command.match(nameTableRegex)[2].camelCase();
				var result = regexResult[f].match(foreignKeyRegex);
				var collumnName = result[1].camelCase().descapitalize();
				var tableReferenceName = result[2].camelCase();

				for(var c in tables[ tableName ]){
					if(tables[ tableName ][ c ].name === collumnName){
						tables[ tableName ][ c ].javaType = tableReferenceName;
						tables[ tableName ][ c ].name = collumnName.replace(/^id/i,"").descapitalize();
						break;
					}
				}
			}
		}
	}
	var total = 0;
	for(tableName in tables){
		var javaCode = processTable(tableName, tables[tableName]);
		self.postMessage({
			type: 'javaClass',
			html: createJavaClass(tableName, javaCode),
			javaCode: javaCode,
			className: tableName,
		});
		total++;
	}
	self.postMessage({
		type: 'end',
		total: total
	});
}
function processFields(SQL){
	var fields = [];
	var all = SQL.split(',');

	var regexResult;
	for(var i in all){
		regexResult = all[i].match(collumnRegex);
		if(regexResult === null)
			continue;
		fields.push({
			name: regexResult[1].camelCase().descapitalize(),
			sqlType: regexResult[2],
			javaType: datatypeInfo[ regexResult[2].toUpperCase() ]
		});
	}

	return fields;
}
function processTable(tableName, fields){

	var javaString = "public class " + tableName + " {\n";

	var i;
	for (i in fields){
		javaString += "\tprivate "+fields[i].javaType+" "+fields[i].name+";\n";
	}

	for(i in fields){
		javaString += "\n\tpublic "+fields[i].javaType+" get"+fields[i].name.capitalize()+"(){\n";
		javaString += "\t\treturn "+fields[i].name+";\n";
		javaString += "\t}\n";

		javaString += "\n\tpublic void set"+fields[i].name.capitalize()+"("+fields[i].javaType+" "+fields[i].name+"){\n";
		javaString += "\t\tthis."+fields[i].name+" = "+fields[i].name+";\n";
		javaString += "\t}\n";
	}
	javaString += "}";

	return javaString;
}
function createJavaClass(className, javaCode){
	return '<div>' +
	'<h6 class="mdl-cell mdl-cell--10-col">' + className + '.java</h6>' +
	'<a href="data:text/java;charset=utf-8,' + encodeURIComponent(javaCode) + '" download="' + className + '.java">' +
	'<button class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect">' +
	'Download <i class="material-icons">file_download</i>' +
	'</button>' +
	'</a>' +
	'</div>' +
	'<pre><code class="java">' + self.hljs.highlightAuto(javaCode).value + '</code></pre>';
}

self.addEventListener('message', function(event) {
	message = event.data;
	if(message.type && message.type == "SQL" && message.sql)
		processSQL(message.sql);

}, false);