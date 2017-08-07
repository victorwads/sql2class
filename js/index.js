//Origin Idea code - http://tools.knowledgewalls.com/mysqltabletojavaclass
window.onload = function(){

	var input = document.getElementById('input');
	var tabOutputButton = document.getElementById('btn-output');
	var cardsList = document.getElementById('java-cards-list');
	var sqlCodeView = document.getElementById('sql-code');
	var downloadAll = document.getElementById('btn-download-all');
	var javaZipCode;

	var SQLWorker = new Worker('./js/workerSQLtoJava.js');
	SQLWorker.addEventListener('message', function (event){
		if(!event.data.type)
			return;
		var element;
		if(event.data.type === "javaClass"){
			element = document.createElement('div');
			element.className = 'mdl-cell mdl-cell--12-col mdl-card mdl-shadow--2dp card-java';
			element.innerHTML = event.data.html;
			cardsList.appendChild(element);

			javaZipCode.file('model/' + event.data.className + '.java', event.data.javaCode);
			javaZipCode.file('dao/' + 'EmBreve' + '.java', '');
		}else if(event.data.type === "end"){
			if(event.data.total === 0){
				downloadAll.style.display = 'none';
				element = document.createElement('div');
				element.className = 'mdl-cell mdl-cell--12-col mdl-card mdl-shadow--2dp card-java';
				element.innerHTML =
				'<div class="title">' +
					'<h6 class="mdl-cell"><i class="material-icons">error</i> Sem conteúdo</h6>' +
				'</div>' +
				'<pre><code class="java">O Bloco SQL de entrada não resultou em nenhum conteúdo. Tente com outro bloco de código SQL.</code></pre>';
				cardsList.appendChild( element );
			}else{
				javaZipCode.file('dao/' + 'Conexao' + '.java', '//Em Breve');
				downloadAll.style.display = '';
			}
		}
	});

	tabOutputButton.addEventListener('click', function (){

		downloadAll.style.display = 'none';
		cardsList.innerHTML = '';
		javaZipCode = new JSZip();
		SQLWorker.postMessage({
			type: 'SQL',
			sql: input.value
		});

	});

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

	var LastSql = "";
	input.addEventListener('keyup', function(){
		// if(LastSql === input.value.trim())
		// worker.		javaZipCode;
		// LastSql = input.value.trim();
		// sqlCodeView.parentElement.		javaZipCode;
	});

};