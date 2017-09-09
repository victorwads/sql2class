self.importScripts('highlight.pack.js');
self.importScripts('languages/java.js');

self.LANGUAGES = {
	java: javaLanguage
};

var collumnRegex = /(\w+)\s+(\w+)[^,]*/;
var nameTableRegex = /(alter|create)\s+table(\s+if\s+not\s+exists)?\s+(\w+\.)?(\w+)/i;
var createTableRegex = /(alter|create)\s+table(\s+if\s+not\s+exists)?\s+(\w+\.)?(\w+)\s*\(\s*(.*)\s*\)/i;
var foreignKeyRegex = /foreign\s+key\s*\(([\w,]+)\)\s*references\s+(\w+\.)?(\w+)\s*\(([\w,]+)\)/i;
var foreignKeysRegex = /foreign\s+key\s*\(([\w,]+)\)\s*references\s+(\w+\.)?(\w+)\s*\(([\w,]+)\)/ig;
var noUseCharactersRegex = /[\r\n`\[\]]/g;
var autoIncrementFieldRegex = /(AUTO_INCREMENT|AUTOINCREMENT)/i;
var primaryKeyAddRegex = /primary\s+key\s*\(([\w,]*)\)/i;
var primaryKeyFieldRegex = /primary\s+key/i;
var doubleSpacesRegex = /  /g;
var commentsRegex = /--.*\n|\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\//g;

function processSQL(SQL, jpa, package, languageName){

	var language = LANGUAGES[languageName];
	var tables = {};
	var foreignKeys = {};

	SQLTratado = SQL;
	SQLTratado = SQLTratado.replace(commentsRegex,"");
	SQLTratado = SQLTratado.replace(noUseCharactersRegex,"");
	SQLTratado = SQLTratado.replace(/tinyint\(1\)/ig,"boolean");
	while( doubleSpacesRegex.test(SQLTratado) && (SQLTratado = SQLTratado.replace(doubleSpacesRegex," ")) );

	var commands = SQLTratado.split(';');
	var command, regexResult;
	var className, collumnName;

	for(var i in commands){
		if( (command = commands[i].trim()) !== ""){

			try {
				className = command.match(nameTableRegex)[4].camelCase();
			} catch(e) {
			}

			regexResult = command.match(createTableRegex);
			if( regexResult !== null && tables[ className ] === undefined ){
				tables[ className ] = {
					sqlName: regexResult[4],
					languageName: className,
					fields: processFields( regexResult[5], language )
				};
			}

			regexResult = command.match(primaryKeyAddRegex);
			if(regexResult !== null){
				collumnName = regexResult[1].split(',');
				for(var j in collumnName)
					collumnName[j] = generateFieldName(collumnName[j].trim());
				for(var p in tables[ className ].fields){
					if(collumnName.indexOf(tables[ className ].fields[ p ].name) !== -1){
						tables[ className ].fields[ p ].primary = true;
					}
				}
			}

			regexResult = command.match(foreignKeysRegex);
			for(var f in regexResult){
				var result = regexResult[f].match(foreignKeyRegex);
				var tableReferenceName = result[3].camelCase();
				collumnName = generateFieldName(result[1]);
				for(var c in tables[ className ].fields){
					if(tables[ className ].fields[ c ].name === collumnName){
						tables[ className ].fields[ c ].reference = true;
						tables[ className ].fields[ c ].referenceType = tables[ className ].fields[ c ].languageType;
						tables[ className ].fields[ c ].referenceFunc = generateFieldName(result[4]).capitalize();
						tables[ className ].fields[ c ].languageType = tableReferenceName;
						tables[ className ].fields[ c ].funcName = collumnName.replace(new RegExp("/"+tableReferenceName+"/ig"),"").replace(/^ID/,"");
						if(tables[ className ].fields[ c ].funcName === "")
							tables[ className ].fields[ c ].funcName = tableReferenceName;
						tables[ className ].fields[ c ].name = tables[ className ].fields[ c ].funcName.uncapitalize();
						break;
					}
				}
			}


		}
	}
	var total = 0;
	var languageClasses, l;
	for(className in tables){
		languageClasses = language.processClasses(package, tables[className], jpa);
		for(l in languageClasses){
			self.postMessage({
				type: 'LanguageClass',
				fileName: languageClasses[l].fileName,
				Code: languageClasses[l].Code,
				highlightedCode: self.hljs.highlightAuto(putLines(languageClasses[l].Code)).value,
			});
			total++;
		}
	}
	languageClasses = language.adcionalClasses();
	for(l in languageClasses){
		self.postMessage({
			type: 'LanguageClass',
			fileName: languageClasses[l].fileName,
			Code: languageClasses[l].Code,
			highlightedCode: self.hljs.highlightAuto(putLines(languageClasses[l].Code)).value,
		});
		total++;
	}
	self.postMessage({
		type: 'end',
		total: total,
		targetSQL: SQL,
		//conexao: 'package '+package+'dao;\n\n'+ConexaoClass
	});
}
function generateFieldName(name){
	return name.camelCase().uncapitalize().replace(/^iD/,'ID');
}
function processFields(SQL, language){
	var fields = [];
	var all = SQL.split(',');

	var regexResult;
	for(var i in all){
		regexResult = all[i].match(collumnRegex);
		if(regexResult === null || language.datatypeInfo[ regexResult[2].toUpperCase() ] === undefined)
			continue;
		field = {
			sqlName: regexResult[1],
			sqlType: regexResult[2],
			auto: autoIncrementFieldRegex.test(all[i]),
			primary: primaryKeyFieldRegex.test(all[i]),
			reference: false
		};
		field.name = generateFieldName(field.sqlName);
		field.funcName = field.name.capitalize();
		field.languageType = language.datatypeInfo[ field.sqlType.toUpperCase() ];
		field.getType = field.languageType==='boolean'?'is':'get';
		fields.push(field);
	}

	return fields;
}
function putLines(string){
	var lines = (string+'').split("\n"), n;
	var pad = ['',' ','  '];
	for(var i in lines){
		n = '' + (i*1+1);
		lines[i] = n + pad[3-n.length] + '|' + lines[i];
	}
	return lines.join("\n");
}

self.addEventListener('message', function(event) {
	message = event.data;
	if(message.type && message.type == "SQL" && message.sql !== undefined)
		processSQL(message.sql, message.jpa, message.package===""?"":(message.package+'.'), message.language);

}, false);

String.prototype.camelCase = function () {
	return this.replace(/([A-Z])/g,"_$1").toLowerCase().replace(/[a-z]*/g, function(txt){
		return txt.capitalize();
	}).replace(/[^\w]|_/g,"");
};
String.prototype.capitalize = function (){
	return this.charAt(0).toUpperCase() + this.substr(1);
};
String.prototype.uncapitalize = function ()
{	return this.charAt(0).toLowerCase() + this.substr(1);
};