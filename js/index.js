//Origin Idea code - http://tools.knowledgewalls.com/mysqltabletojavaclass
window.onload = function(){

	var inputLanguage = document.getElementById('language');
	var inputPackage = document.getElementById('package');
	var input = document.getElementById('input');
	var tabOutputButton = document.getElementById('btn-output');
	var cardsList = document.getElementById('language-cards-list');
	var sqlCodeView = document.getElementById('sql-code');
	var downloadAll = document.getElementById('btn-download-all');
	var progress = document.getElementById('progress');
	var jpa = document.getElementById('switch-jpa');
	var javaZipCode;

	var SQLWorker = new Worker('./js/workerSQLtoClass.js');
	SQLWorker.addEventListener('message', function (event){
		if(!event.data.type)
			return;
		var element;
		if(event.data.type === "LanguageClass"){
			element = document.createElement('div');
			element.className = 'mdl-cell mdl-cell--12-col mdl-card mdl-shadow--2dp language-card';
			element.innerHTML = createLanguageClass(event.data.fileName, event.data.Code, event.data.highlightedCode);
			addViewCodeClick(element);
			cardsList.appendChild(element);
			javaZipCode.file(event.data.fileName, event.data.Code);
		}else if(event.data.type === "end"){
			if(event.data.total === 0){
				downloadAll.style.opacity = 0;
				progress.style.opacity = 0;
				element = document.createElement('div');
				element.className = 'mdl-cell mdl-cell--12-col mdl-card mdl-shadow--2dp language-card';
				element.innerHTML =
				'<div class="title">' +
				'<h6 class="mdl-cell"><i class="material-icons">error</i> Sem conteúdo</h6>' +
				'</div>' +
				'<pre><code class="java">O Bloco SQL de entrada não resultou em nenhum conteúdo. Tente com outro bloco de código SQL.</code></pre>';
				cardsList.appendChild( element );
			}else{
				downloadAll.style.opacity = 1;
				progress.style.opacity = 0;
			}
		}
	});

	tabOutputButton.addEventListener('click', function (){

		downloadAll.style.opacity = 0;
		progress.style.opacity = 1;
		cardsList.innerHTML = '';
		javaZipCode = new JSZip();
		SQLWorker.postMessage({
			type: 'SQL',
			sql: input.value,
			jpa: jpa.checked,
			language: inputLanguage.getAttribute('data-val'),
			package: inputPackage.value,
		});

	});

	downloadAll.addEventListener('click', function (){
		javaZipCode.generateAsync({type:"blob"}).then(function (blob) {
			saveAs(blob, inputPackage.value+"javaClasses.zip");
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
function addViewCodeClick(element){
	var pre = element.querySelector('pre');
	pre.style.height = 0;
	pre.style.paddingTop = 0;
	pre.style.paddingBottom = 0;
	pre.style.marginTop = 0;
	pre.style.marginBottom = 0;
	element.querySelector('.btn-view').addEventListener('click', function (e){
		if(this.viewEnabled){
			pre.style.height = 0;
			pre.style.paddingTop = 0;
			pre.style.paddingBottom = 0;
			pre.style.marginTop = 0;
			pre.style.marginBottom = 0;
			this.viewEnabled = false;
		}else{
			pre.style.height = pre.scrollHeight + 'px';
			pre.style.paddingTop = '';
			pre.style.paddingBottom = '';
			pre.style.marginTop = '';
			pre.style.marginBottom = '';
			this.viewEnabled = true;
		}
	});

}
function createLanguageClass(fileName, Code, highlightedCode){
	return '<div class="title">' +
		'<h6 class="mdl-cell mdl-cell--10-col"><i class="material-icons">description</i> ' + fileName + '</h6>' +
		'<a href="data:text/java;charset=utf-8,' + encodeURIComponent(Code) + '" download="' + (fileName+'').replace("/","_") + '">' +
				'<button class="mdl-button mdl-js-button"><i class="material-icons">file_download</i></button>' +
		'</a>' +
		'<button class="mdl-button mdl-js-button btn-view"><i class="material-icons">remove_red_eye</i></button>' +
	'</div>' +
	'<pre><code>' + highlightedCode + '</code></pre>';
}

//Google Analytics
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
	(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
	m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-104206956-2', 'auto');
ga('send', 'pageview');

//Private Analytics
(function(i,s,o,g,a,m){a=s.createElement(o),m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)})(window,document,'script','https://privateanalytics.kavi.ga/embeded/script.js');