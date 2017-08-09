importScripts('highlight.pack.js');

var ConexaoClass = 'package dao;\n'+'\n'+'import java.sql.Connection;\n'+'import java.sql.DriverManager;\n'+'import java.sql.PreparedStatement;\n'+'\n'+'public class Conexao {\n'+'\n'+'\tprotected Connection con;\n'+'\tprivate boolean autoClose = true;\n'+'\n'+'\tpublic Conexao() {\n'+'\t\ttry {\n'+'\t\t\tfinal String URL = "jdbc:stringDeConexao";\n'+'\t\t\tcon = DriverManager.getConnection(URL, "DBlogin", "DBpassword");\n'+'\t\t\tPreparedStatement ps = con.prepareStatement("PRAGMA foreign_keys = ON");\n'+'\t\t\tps.execute();\n'+'\t\t} catch (Exception e) {\n'+'\t\t\te.printStackTrace();\n'+'\t\t}\n'+'\t}\n'+'\n'+'\tpublic void setAutoClose(boolean autoClose) {\n'+'\t\tthis.autoClose = autoClose;\n'+'\t}\n'+'\n'+'\tpublic void closeConnection() {\n'+'\t\ttry {\n'+'\t\t\tcon.close();\n'+'\t\t} catch (Exception e) {\n'+'\t\t}\n'+'\t}\n'+'\n'+'\tprotected void close() {\n'+'\t\tif (autoClose) {\n'+'\t\t\tcloseConnection();\n'+'\t\t}\n'+'\t}\n'+'\n'+'\tprotected java.sql.Date toDate(java.util.Date data) {\n'+'\t\treturn new java.sql.Date(data.getTime());\n'+'\t}\n'+'\n'+'\tprotected java.util.Date toDate(java.sql.Date data) {\n'+'\t\treturn new java.util.Date(data.getTime());\n'+'\t}\n'+'\n'+'}\n';

var collumnRegex = /(\w+)\s+(\w+)[^,]*/;
var nameTableRegex = /(alter|create)\s+table(\s+if\s+not\s+exists)?\s+(\w+\.)?(\w+)/i;
var createTableRegex = /(alter|create)\s+table(\s+if\s+not\s+exists)?\s+(\w+\.)?(\w+)\s*\(\s*(.*)\s*\)/i;
var foreignKeyRegex = /foreign\s+key\s*\(([\w,]+)\)\s*references\s+(\w+)\s*\(([\w,]+)\)/i;
var foreignKeysRegex = /foreign\s+key\s*\(([\w,]+)\)\s*references\s+(\w+)\s*\(([\w,]+)\)/ig;
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

function processSQL(SQL){

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
					collumnName[j] = collumnName[j].trim().camelCase().descapitalize();
				for(var p in tables[ className ].fields){
					if(collumnName.indexOf(tables[ className ].fields[ p ].name) !== -1){
						tables[ className ].fields[ p ].primary = true;
					}
				}
			}

			regexResult = command.match(foreignKeysRegex);
			for(var f in regexResult){
				var result = regexResult[f].match(foreignKeyRegex);
				var tableReferenceName = result[2].camelCase();
				collumnName = result[1].camelCase().descapitalize();
				for(var c in tables[ className ].fields){
					if(tables[ className ].fields[ c ].name === collumnName){
						tables[ className ].fields[ c ].javaType = tableReferenceName;
						tables[ className ].fields[ c ].name = collumnName.replace(/^iD(.+)/,"$1").descapitalize();
						break;
					}
				}
			}


		}
	}
	var total = 0;
	for(className in tables){
		var javaCode = processTable(tables[className]);
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
function processFields(SQL){
	var fields = [];
	var all = SQL.split(',');

	var regexResult;
	for(var i in all){
		regexResult = all[i].match(collumnRegex);
		if(regexResult === null || datatypeInfo[ regexResult[2].toUpperCase() ] === undefined)
			continue;
		console.log(regexResult[1], autoIncrementFieldRegex.test(all[i]));
		fields.push({
			auto: autoIncrementFieldRegex.test(all[i]),
			primary: primaryKeyFieldRegex.test(all[i]),
			name: regexResult[1].camelCase().descapitalize(),
			javaType: datatypeInfo[ regexResult[2].toUpperCase() ],
			sqlName: regexResult[1],
			sqlType: regexResult[2]
		});
	}

	return fields;
}
function processTable(classInfo){

	var className = classInfo.javaName;
	var fields = classInfo.fields;

	var javaString = 'package model;\n\n'+
	'@Entity\n'+
	'@Table(name = "' + classInfo.sqlName + '")\n'+
	'public class ' + className + ' {\n\n';

	var i;
	for (i in fields){
		fields[i].name = fields[i].name.replace(/^iD/,'ID');
		javaString +=
		(fields[i].primary?'\t@Id\n':'')+
		(fields[i].auto?'\t@GeneratedValue\n':'')+
		'\t@Column(name = "' + fields[i].sqlName + '")\n'+
		'\tprivate '+fields[i].javaType+' '+fields[i].name+';\n';
	}

	for(i in fields){
		javaString += '\n\tpublic '+fields[i].javaType+(fields[i].javaType==='boolean'?' is':' get')+fields[i].name.capitalize()+'(){\n';
		javaString += '\t\treturn '+fields[i].name+';\n';
		javaString += '\t}\n';

		javaString += '\n\tpublic ' + className + ' set'+fields[i].name.capitalize()+'('+fields[i].javaType+' '+fields[i].name+'){\n';
		javaString += '\t\tthis.'+fields[i].name+' = '+fields[i].name+';\n';
		javaString += '\t\treturn this;\n';
		javaString += '\t}\n';
	}
	javaString += '}';

	return javaString;
}
function createJavaDaoClass(classInfo){

	var className = classInfo.javaName;
	var fields = classInfo.fields;

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
	'\t\t\tPreparedStatement ps = con.prepareStatement("INSERT INTO ' + classInfo.sqlName + ' (' + fieldsNames.join(', ') + ') VALUES (' + fieldsInsertPlaceHolders.join(', ') + ')"' + (primaryKey.length?', Statement.RETURN_GENERATED_KEYS':'') + ');\n';

	for(i in fields){
		f = fields[i];
		if(f.primary && primaryKey.length === 1)
			continue;
		if(f.javaType === 'java.util.Date')
			javaClassCode += '\t\t\tps.setDate(++i, toDate(o.get' + f.name.capitalize() + '()));\n';
		else
			javaClassCode += '\t\t\tps.set' + f.javaType.capitalize() + '(++i, o.' + (f.javaType==='boolean'?'is':'get') + f.name.capitalize() + '());\n';
	}

	javaClassCode +=
	'\t\t\tok = ps.executeUpdate() > 0;\n'+
	(
		primaryKey.length === 1?
		'\t\t\tResultSet rs = ps.getGeneratedKeys();\n'+
		'\t\t\trs.next();\n'+
		'\t\t\to.set' + primaryKey[0].name.capitalize() + '(rs.get' + primaryKey[0].javaType.capitalize() + '(1));\n'
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
			if(f.javaType === 'int' || f.javaType === 'long')
				javaClassCode += '\t\tif (o.get' + f.name.capitalize() + '() == 0) return false;\n';
			else
				javaClassCode += '\t\tif (o.get' + f.name.capitalize() + '() == null) return false;\n';
		}

		javaClassCode +=
		'\t\ttry {\n'+
		'\t\t\tint i = 0;\n'+
		'\t\t\tPreparedStatement ps = con.prepareStatement("UPDATE ' + classInfo.sqlName + ' SET ' + fieldsUpdatePlaceHolders.join(', ') + ' WHERE ' + primaryKeySet.join(' and ') + '");\n';

		var tempCode, tempCodeBlock = '';
		for(i in fields){
			f = fields[i];
			if(f.javaType === 'java.util.Date')
				tempCode = '\t\t\tps.setDate(++i, toDate(o.get' + f.name.capitalize() + '()));\n';
			else
				tempCode = '\t\t\tps.set' + f.javaType.capitalize() + '(++i, o.' + (f.javaType==='boolean'?'is':'get') + f.name.capitalize() + '());\n';
			if(f.primary)
				tempCodeBlock += tempCode;
			else
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
		f = primaryKey[i];
		if(f.javaType === 'java.util.Date')
			javaClassCode += '\t\t\tps.setDate(++i, toDate(o.get' + f.name.capitalize() + '()));\n';
		else
			javaClassCode += '\t\t\tps.set' + f.javaType.capitalize() + '(++i, o.get' + f.name.capitalize() + '());\n';
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

	for(i in fields){
		f = fields[i];
		if(f.javaType === 'java.util.Date')
			javaClassCode += '\t\t\t\to.set' + f.name.capitalize() + '(toDate(rs.getDate(++i)));\n';
		else
			javaClassCode += '\t\t\t\to.set' + f.name.capitalize() + '(rs.get' + f.javaType.capitalize() + '(++i));\n';
	}

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
	'<button class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect">' +
	'Download <i class="material-icons">file_download</i>' +
	'</button>' +
	'</a>' +
	'</div>' +
	'<pre><code class="java">' + self.hljs.highlightAuto(putLines(javaCode)).value + '</code></pre>';
}

self.addEventListener('message', function(event) {
	message = event.data;
	if(message.type && message.type == "SQL" && message.sql !== undefined)
		processSQL(message.sql);

}, false);

String.prototype.camelCase = function () {
	return this.replace(/([A-Z])/g,"_$1").toLowerCase().replace(/[a-z]*/g, function(txt){
		return txt.capitalize();
	}).replace(/[^a-zA-Z]/g,"");
};
String.prototype.capitalize = function (){
	return this.charAt(0).toUpperCase() + this.substr(1);
};
String.prototype.descapitalize = function ()
{	return this.charAt(0).toLowerCase() + this.substr(1);
};