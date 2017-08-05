importScripts('highlight.pack.js');
self.addEventListener('message', function(event) {
	self.postMessage(self.hljs.highlightAuto(event.data).value);
}, false);