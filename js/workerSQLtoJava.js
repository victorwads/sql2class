importScripts('highlight.pack.js');

var ConexaoClass = 'package dao;\n'+'\n'+'import java.sql.Connection;\n'+'import java.sql.DriverManager;\n'+'import java.sql.PreparedStatement;\n'+'\n'+'public class Conexao {\n'+'\n'+'\tprotected Connection con;\n'+'\tprivate boolean autoClose = true;\n'+'\n'+'\tpublic Conexao() {\n'+'\t\ttry {\n'+'\t\t\tfinal String URL = "jdbc:stringDeConexao";\n'+'\t\t\tcon = DriverManager.getConnection(URL, "DBlogin", "DBpassword");\n'+'\t\t\tPreparedStatement ps = con.prepareStatement("PRAGMA foreign_keys = ON");\n'+'\t\t\tps.execute();\n'+'\t\t} catch (Exception e) {\n'+'\t\t\te.printStackTrace();\n'+'\t\t}\n'+'\t}\n'+'\n'+'\tpublic void setAutoClose(boolean autoClose) {\n'+'\t\tthis.autoClose = autoClose;\n'+'\t}\n'+'\n'+'\tpublic void closeConnection() {\n'+'\t\ttry {\n'+'\t\t\tcon.close();\n'+'\t\t} catch (Exception e) {\n'+'\t\t}\n'+'\t}\n'+'\n'+'\tprotected void close() {\n'+'\t\tif (autoClose) {\n'+'\t\t\tcloseConnection();\n'+'\t\t}\n'+'\t}\n'+'\n'+'\tprotected java.sql.Date toDate(java.util.Date data) {\n'+'\t\treturn new java.sql.Date(data.getTime());\n'+'\t}\n'+'\n'+'\tprotected java.util.Date toDate(java.sql.Date data) {\n'+'\t\treturn new java.util.Date(data.getTime());\n'+'\t}\n'+'\n'+'}\n';

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

var datatypeInfo = {
	LONGTEXT: "String",		BIGINT: "long",
	TEXT: "String",			LONG: "long",
	VARCHAR: "String",		REAL: "float",
	CHAR: "String",			FLOAT: "float",
	CHARACTER: "String",	DOUBLE: "double",
	SET: "String",			DECIMAL: "double",
	MULTISET: "String",		BINARY: "byte[]",
	BOOLEAN: "boolean",		VARBINARY: "byte[]",
	SMALLINT: "int",		TIME: "java.util.Date",
	TINYINT: "int",			DATE: "java.util.Date",
	INT: "int",				DATETIME: "java.util.Date",
	INTEGER: "int",			TIMESTAMP: "java.util.Date",
	NUMERIC: "int",			BLOB: "java.sql.Blob",
	INTERVAL: "int",		LONGBLOB: "java.sql.Blob"
};

function processSQL(SQL, jpa){

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
					javaName: className,
					fields: processFields( regexResult[5] )
				};
			}

			regexResult = command.match(primaryKeyAddRegex);
			if(regexResult !== null){
				collumnName = regexResult[1].split(',');
				for(var j in collumnName)
					collumnName[j] = collumnName[j].trim().camelCase().uncapitalize();
				for(var p in tables[ className ].fields){
					if(collumnName.indexOf(tables[ className ].fields[ p ].name) !== -1){
						tables[ className ].fields[ p ].primary = true;
					}
				}
			}

			regexResult = command.match(foreignKeysRegex);
			console.log(regexResult);
			for(var f in regexResult){
				var result = regexResult[f].match(foreignKeyRegex);
				var tableReferenceName = result[3].camelCase();
				collumnName = generateFieldName(result[1]);
				for(var c in tables[ className ].fields){
					if(tables[ className ].fields[ c ].name === collumnName){
						tables[ className ].fields[ c ].reference = true;
						tables[ className ].fields[ c ].referenceType = tables[ className ].fields[ c ].javaType;
						tables[ className ].fields[ c ].referenceFunc = generateFieldName(result[4]).capitalize();
						tables[ className ].fields[ c ].javaType = tableReferenceName;
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
	for(className in tables){
		var javaCode = processTable(tables[className], jpa);
		var javaDaoCode = createJavaDaoClass(tables[className]);
		self.postMessage({
			type: 'javaClass',
			html: createJavaClass(className, javaCode, 'model/'),
			daoHtml: createJavaClass(className, javaDaoCode, 'dao/'),
			javaCode: javaCode,
			javaDaoCode: javaDaoCode,
			className: className,
		});
		total++;
	}
	self.postMessage({
		type: 'end',
		total: total,
		targetSQL: SQL,
		conexao: ConexaoClass
	});
}
function generateFieldName(name){
	return name.camelCase().uncapitalize().replace(/^iD/,'ID');
}
function processFields(SQL){
	var fields = [];
	var all = SQL.split(',');

	var regexResult;
	for(var i in all){
		regexResult = all[i].match(collumnRegex);
		if(regexResult === null || datatypeInfo[ regexResult[2].toUpperCase() ] === undefined)
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
		field.javaType = datatypeInfo[ field.sqlType.toUpperCase() ];
		field.getType = field.javaType==='boolean'?'is':'get';
		fields.push(field);
	}

	return fields;
}
function processTable(classInfo, jpa){

	var className = classInfo.javaName;
	var fields = classInfo.fields;
	var field;

	var javaString = 'package model;\n\n'+
	(jpa?'@Entity\n':'')+
	(jpa?'@Table(name = "' + classInfo.sqlName + '")\n':'')+
	'public class ' + className + ' {\n\n';

	var i;
	for (i in fields){
		field = fields[i];
		javaString +=
		(jpa&&field.primary?'\t@Id\n':'')+
		(jpa&&field.auto?'\t@GeneratedValue\n':'')+
		(jpa?'\t@Column(name = "' + field.sqlName + '")\n':'')+
		'\tprivate '+field.javaType+' '+field.name+';\n';
	}

	for(i in fields){
		field = fields[i];
		javaString += '\n\tpublic ' + field.javaType + ' ' + field.getType + field.funcName +'(){\n';
		javaString += '\t\treturn '+field.name+';\n';
		javaString += '\t}\n';

		javaString += '\n\tpublic ' + className + ' set' + field.funcName + '(' + field.javaType + ' ' + field.name + '){\n';
		javaString += '\t\tthis.' + field.name + ' = ' + field.name + ';\n';
		javaString += '\t\treturn this;\n';
		javaString += '\t}\n';
	}
	javaString += '}';

	return javaString;
}
function createJavaDaoClass(classInfo){

	var className = classInfo.javaName;
	var fields = classInfo.fields;

	var autoGenerated = null;
	var primaryKey = [];
	var primaryKeySet = [];
	var fieldsNamesAll = [];
	var fieldsNames = [];
	var fieldsInsertPlaceHolders = [];
	var fieldsUpdatePlaceHolders = [];
	var i, f;

	for(i in fields){
		if(fields[i].primary){
			primaryKey.push(fields[i]);
			primaryKeySet.push(fields[i].sqlName + ' = ?');
		}
		if(fields[i].auto)
			autoGenerated = fields[i];
	}
	for(i in fields){
		f = fields[i];
		if(!fields[i].primary || primaryKey.length > 1){
			fieldsNames.push(f.sqlName);
			fieldsInsertPlaceHolders.push('?');
		}
		if(!fields[i].primary)
			fieldsUpdatePlaceHolders.push(f.sqlName + ' = ?');
		fieldsNamesAll.push(f.sqlName);
	}

	function setJDBCFieldCode(field){
		if(field.javaType === 'java.util.Date')
			return 'ps.setDate(++i, toDate(o.get' + field.funcName + '()));\n';
		if(field.reference)
			return 'ps.set' + field.referenceType.capitalize() + '(++i, o.get' + field.funcName + '().get' + field.referenceFunc + '() );\n';
		else
			return 'ps.set' + field.javaType.capitalize() + '(++i, o.' + field.getType + field.funcName + '());\n';
	}
	function getJDBCFieldCode(field){
		if(field.javaType === 'java.util.Date')
			return 'o.set' + field.funcName + '( toDate(rs.getDate(++i)) );\n';
		if(field.reference){

			return 'o.set' + field.funcName + '( new model.' + field.javaType + '().set' + field.referenceFunc + '( rs.get' + field.referenceType.capitalize() + '(++i) ) );\n';
		}else
			return 'o.set' + field.funcName + '(rs.get' + field.javaType.capitalize() + '(++i));\n';
	}

	var javaClassCode =
	'package dao;\n'+
	'\n'+
	'import java.sql.PreparedStatement;\n'+
	'import java.sql.ResultSet;\n'+
	'import java.sql.Statement;\n'+
	'import java.util.ArrayList;\n'+
	'\n'+
	'public class ' + className + ' extends Conexao {\n'+
	'\n'+
	'\tpublic boolean inserir(model.' + className + ' o) {\n'+
	'\t\tboolean ok = false;\n'+
	'\t\ttry {\n'+
	'\t\t\tint i = 0;\n'+
	'\t\t\tPreparedStatement ps = con.prepareStatement("INSERT INTO ' + classInfo.sqlName + ' (' + fieldsNames.join(', ') + ') VALUES (' + fieldsInsertPlaceHolders.join(', ') + ')"' + (autoGenerated!==null?', Statement.RETURN_GENERATED_KEYS':'') + ');\n';

	for(i in fields)
		if(!f.auto)
			javaClassCode += '\t\t\t' + setJDBCFieldCode(fields[i]);

	javaClassCode +=
	'\t\t\tok = ps.executeUpdate() > 0;\n'+
	(
		autoGenerated !== null?
		'\t\t\tResultSet rs = ps.getGeneratedKeys();\n'+
		'\t\t\trs.next();\n'+
		'\t\t\to.set' + autoGenerated.funcName + '(rs.get' + autoGenerated.javaType.capitalize() + '(1));\n'
		:''
		)+
	'\t\t} catch( Exception e ) {\n'+
	'\t\t} finally {\n'+
	'\t\t\tclose();\n'+
	'\t\t}\n'+
	'\t\treturn ok;\n'+
	'\t}\n';

	if(primaryKey.length){
		javaClassCode +=
		'\n'+
		'\tpublic boolean atualizar(model.' + className + ' o) {\n';

		for(i in primaryKey){
			f = primaryKey[i];
			javaClassCode += '\t\tif (o.' + f.getType + f.funcName + '() == ';
			if( f.javaType === "String" )
				javaClassCode += 'null) return false;\n';
			else
				javaClassCode += '0) return false;\n';
		}

		javaClassCode +=
		'\t\ttry {\n'+
		'\t\t\tint i = 0;\n'+
		'\t\t\tPreparedStatement ps = con.prepareStatement("UPDATE ' + classInfo.sqlName + ' SET ' + fieldsUpdatePlaceHolders.join(', ') + ' WHERE ' + primaryKeySet.join(' and ') + '");\n';

		var tempCode, tempCodeBlock = '';
		for(i in fields){
			tempCode = '\t\t\t' + setJDBCFieldCode(fields[i]);
			if(fields[i].primary)
				tempCodeBlock += tempCode;
			else if(!fields[i].auto)
				javaClassCode += tempCode;
		}

		javaClassCode +=
		tempCodeBlock+
		'\t\t\treturn ps.executeUpdate() > 0;\n'+
		'\t\t} catch (Exception e) {\n'+
		'\t\t\treturn false;\n'+
		'\t\t} finally {\n'+
		'\t\t\tclose();\n'+
		'\t\t}\n'+
		'\t}\n';
	}
	javaClassCode +=
	'\n'+
	'\tpublic boolean excluir(model.' + className + ' o) {\n'+
	'\t\ttry {\n'+
	'\t\t\tint i = 0;\n'+
	'\t\t\tPreparedStatement ps = con.prepareStatement("DELETE FROM ' + classInfo.sqlName + ' WHERE ' + primaryKeySet.join(' and ') + '");\n';

	for(i in primaryKey){
		javaClassCode += '\t\t\t' + setJDBCFieldCode(primaryKey[i]);
	}

	javaClassCode +=
	'\t\t\treturn ps.executeUpdate() > 0;\n'+
	'\t\t} catch (Exception e) {\n'+
	'\t\t\treturn false;\n'+
	'\t\t} finally {\n'+
	'\t\t\tclose();\n'+
	'\t\t}\n'+
	'\t}\n'+
	'\n'+
	'\tpublic model.' + className + '[] listar() {\n'+
	'\t\tArrayList<model.' + className + '> objs = new ArrayList<>();\n'+
	'\t\tmodel.' + className + '[] rt = null;\n'+
	'\t\ttry {\n'+
	'\t\t\tint i;\n'+
	'\t\t\tmodel.' + className + ' o;\n'+
	'\t\t\tPreparedStatement ps = con.prepareStatement("SELECT ' + fieldsNamesAll.join(', ') + ' FROM ' + classInfo.sqlName + '");\n'+
	'\t\t\tResultSet rs = ps.executeQuery();\n'+
	'\t\t\twhile (rs.next()) {\n'+
	'\t\t\t\ti = 0;\n'+
	'\t\t\t\to = new model.' + className + '();\n';

	for(i in fields)
		javaClassCode += '\t\t\t\t' + getJDBCFieldCode(fields[i]);

	javaClassCode +=
	'\t\t\t\tobjs.add(o);\n'+
	'\t\t\t}\n'+
	'\t\t\trt = new model.' + className + '[objs.size()];\n'+
	'\t\t\ti = 0;\n'+
	'\t\t\tfor (model.' + className + ' r : objs) {\n'+
	'\t\t\t\trt[i++] = r;\n'+
	'\t\t\t}\n'+
	'\t\t} catch (Exception e) {\n'+
	'\t\t\te.printStackTrace();\n'+
	'\t\t} finally {\n'+
	'\t\t\tclose();\n'+
	'\t\t}\n'+
	'\t\treturn rt;\n'+
	'\t}\n'+
	'}\n';
	return javaClassCode;
}

function putLines(string){
	var lines = string.split("\n"), n;
	var pad = ['',' ','  '];
	for(var i in lines){
		n = '' + (i*1+1);
		lines[i] = n + pad[3-n.length] + '|' + lines[i];
	}
	return lines.join("\n");
}

function createJavaClass(className, javaCode, dir){
	return '<div class="title">' +
		'<h6 class="mdl-cell mdl-cell--10-col"><i class="material-icons">description</i> ' + dir + className + '.java</h6>' +
		'<a href="data:text/java;charset=utf-8,' + encodeURIComponent(javaCode) + '" download="' + (dir + className).replace("/","_") + '.java">' +
				'<button class="mdl-button mdl-js-button"><i class="material-icons">file_download</i></button>' +
		'</a>' +
		'<button class="mdl-button mdl-js-button btn-view"><i class="material-icons">remove_red_eye</i></button>' +
	'</div>' +
	'<pre><code class="java">' + self.hljs.highlightAuto(putLines(javaCode)).value + '</code></pre>';
}

self.addEventListener('message', function(event) {
	message = event.data;
	if(message.type && message.type == "SQL" && message.sql !== undefined)
		processSQL(message.sql, message.jpa);

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