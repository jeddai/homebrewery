/* eslint-disable max-lines */
require('./codeEditor.less');
const React = require('react');
const createClass = require('create-react-class');
const _ = require('lodash');
const cx = require('classnames');
const closeTag = require('./helpers/close-tag');

let CodeMirror;
if(typeof navigator !== 'undefined'){
	CodeMirror = require('codemirror');

	//Language Modes
	require('codemirror/mode/gfm/gfm.js'); //Github flavoured markdown
	require('codemirror/mode/css/css.js');
	require('codemirror/mode/javascript/javascript.js');

	//Addons
	require('codemirror/addon/fold/foldcode.js');
	require('codemirror/addon/fold/foldgutter.js');
	require('codemirror/addon/fold/xml-fold.js');
	require('codemirror/addon/search/search.js');
	require('codemirror/addon/search/searchcursor.js');
	require('codemirror/addon/search/jump-to-line.js');
	require('codemirror/addon/search/match-highlighter.js');
	require('codemirror/addon/search/matchesonscrollbar.js');
	require('codemirror/addon/dialog/dialog.js');
	require('codemirror/addon/edit/closetag.js');
	require('codemirror/addon/edit/trailingspace.js');
	require('codemirror/addon/selection/active-line.js');

	const foldCode = require('./helpers/fold-code');
	foldCode.registerHomebreweryHelper(CodeMirror);
}

const themeWidgets = [{
	name    : 'monster',
	pattern : '^{{monster(?:[^a-zA-Z].*)?$',
	classes : ['frame', 'wide']
}, {
	name    : 'classTable',
	pattern : '^{{classTable(?:[^a-zA-Z].*)?$',
	classes : ['frame', 'decoration', 'wide']
}, {
	name    : 'image',
	pattern : '^!\\[(?:[a-zA-Z ]+)?\\]\\(.*\\).*{[a-zA-Z0-9:, -]+}$',
	fields  : []
}, {
	name    : 'artist',
	pattern : '^{{artist([^a-zA-Z].*)?$',
	fields  : [{
		name      : 'top',
		pattern   : 'top:((?:-)?\\d*.?\\d*)px',
		type      : 'number',
		increment : 5
	}, {
		name      : 'left',
		pattern   : 'left:((?:-)?\\d*.?\\d*)px',
		type      : 'number',
		increment : 5
	}]
}];

const CodeEditor = createClass({
	getDefaultProps : function() {
		return {
			language : '',
			value    : '',
			wrap     : true,
			onChange : ()=>{}
		};
	},

	getInitialState : function() {
		return {
			docs          : {},
			widgetUtils   : {},
			focusedWidget : null
		};
	},

	componentDidMount : function() {
		this.buildEditor();
		const newDoc = CodeMirror.Doc(this.props.value, this.props.language);
		this.codeMirror.swapDoc(newDoc);
	},

	componentDidUpdate : function(prevProps) {
		if(prevProps.view !== this.props.view){ //view changed; swap documents
			let newDoc;

			if(!this.state.docs[this.props.view]) {
				newDoc = CodeMirror.Doc(this.props.value, this.props.language);
			} else {
				newDoc = this.state.docs[this.props.view];
			}

			const oldDoc = { [prevProps.view]: this.codeMirror.swapDoc(newDoc) };

			this.setState((prevState)=>({
				docs : _.merge({}, prevState.docs, oldDoc)
			}));

			this.props.rerenderParent();
		} else if(this.codeMirror?.getValue() != this.props.value) { //update editor contents if brew.text is changed from outside
			this.codeMirror.setValue(this.props.value);
		}

		this.state.widgetUtils.updateWidgetGutter();
		this.state.widgetUtils.updateAllLineWidgets();
	},

	buildEditor : function() {
		this.codeMirror = CodeMirror(this.refs.editor, {
			lineNumbers       : true,
			lineWrapping      : this.props.wrap,
			indentWithTabs    : true,
			tabSize           : 2,
			historyEventDelay : 250,
			extraKeys         : {
				'Ctrl-B'     : this.makeBold,
				'Cmd-B'      : this.makeBold,
				'Ctrl-I'     : this.makeItalic,
				'Cmd-I'      : this.makeItalic,
				'Ctrl-M'     : this.makeSpan,
				'Cmd-M'      : this.makeSpan,
				'Ctrl-/'     : this.makeComment,
				'Cmd-/'      : this.makeComment,
				'Ctrl-['     : this.foldAllCode,
				'Cmd-['      : this.foldAllCode,
				'Ctrl-]'     : this.unfoldAllCode,
				'Cmd-]'      : this.unfoldAllCode,
				'Ctrl-Alt-F' : this.findPersistent,
				'Cmd-Opt-F'  : this.findPersistent
			},
			foldGutter  : true,
			foldOptions : {
				scanUp      : true,
				rangeFinder : CodeMirror.fold.homebrewery,
				widget      : (from, to)=>{
					let text = '';
					let currentLine = from.line;
					const maxLength = 50;
					while (currentLine <= to.line && text.length <= maxLength) {
						text += this.codeMirror.getLine(currentLine);
						if(currentLine < to.line)
							text += ' ';
						currentLine += 1;
					}

					text = text.trim();
					if(text.length > maxLength)
						text = `${text.substr(0, maxLength)}...`;

					return `\u21A4 ${text} \u21A6`;
				}
			},
			gutters           : ['CodeMirror-linenumbers', 'CodeMirror-foldgutter', 'widget-gutter'],
			showTrailingSpace : true,
			autoCloseTags     : true,
			styleActiveLine   : true
		});
		closeTag.autoCloseCurlyBraces(CodeMirror, this.codeMirror);

		this.setState({
			widgetUtils : require('./helpers/widgets')(CodeMirror, themeWidgets, this.codeMirror)
		});

		// Note: codeMirror passes a copy of itself in this callback. cm === this.codeMirror. Either one works.
		this.codeMirror.on('change', (cm)=>{
			this.props.onChange(cm.getValue());

			this.state.widgetUtils.updateWidgetGutter();
		});

		this.codeMirror.on('gutterClick', (cm, n)=>{
			const { gutterMarkers } = this.codeMirror.lineInfo(n);

			if(!!gutterMarkers && !!gutterMarkers['widget-gutter']) {
				const { widgets } = this.codeMirror.lineInfo(n);
				if(!widgets) {
					this.state.widgetUtils.updateLineWidgets(n);
				} else {
					this.codeMirror.operation(()=>{
						for (const widget of widgets) {
							this.state.widgetUtils.removeLineWidgets(widget);
						}
					});
				}
			}
		});
		this.updateSize();
	},

	makeBold : function() {
		const selection = this.codeMirror.getSelection(), t = selection.slice(0, 2) === '**' && selection.slice(-2) === '**';
		this.codeMirror.replaceSelection(t ? selection.slice(2, -2) : `**${selection}**`, 'around');
		if(selection.length === 0){
			const cursor = this.codeMirror.getCursor();
			this.codeMirror.setCursor({ line: cursor.line, ch: cursor.ch - 2 });
		}
	},

	makeItalic : function() {
		const selection = this.codeMirror.getSelection(), t = selection.slice(0, 1) === '_' && selection.slice(-1) === '_';
		this.codeMirror.replaceSelection(t ? selection.slice(1, -1) : `_${selection}_`, 'around');
		if(selection.length === 0){
			const cursor = this.codeMirror.getCursor();
			this.codeMirror.setCursor({ line: cursor.line, ch: cursor.ch - 1 });
		}
	},

	makeSpan : function() {
		const selection = this.codeMirror.getSelection(), t = selection.slice(0, 2) === '{{' && selection.slice(-2) === '}}';
		this.codeMirror.replaceSelection(t ? selection.slice(2, -2) : `{{ ${selection}}}`, 'around');
		if(selection.length === 0){
			const cursor = this.codeMirror.getCursor();
			this.codeMirror.setCursor({ line: cursor.line, ch: cursor.ch - 2 });
		}
	},

	makeComment : function() {
		const selection = this.codeMirror.getSelection(), t = selection.slice(0, 4) === '<!--' && selection.slice(-3) === '-->';
		this.codeMirror.replaceSelection(t ? selection.slice(4, -3) : `<!-- ${selection} -->`, 'around');
		if(selection.length === 0){
			const cursor = this.codeMirror.getCursor();
			this.codeMirror.setCursor({ line: cursor.line, ch: cursor.ch - 4 });
		}
	},

	foldAllCode : function() {
		this.codeMirror.execCommand('foldAll');
	},

	unfoldAllCode : function() {
		this.codeMirror.execCommand('unfoldAll');
	},

	findPersistent : function() {
		this.codeMirror.execCommand('findPersistent');
	},

	//=-- Externally used -==//
	setCursorPosition : function(line, char){
		setTimeout(()=>{
			this.codeMirror.focus();
			this.codeMirror.doc.setCursor(line, char);
		}, 10);
	},
	getCursorPosition : function(){
		return this.codeMirror.getCursor();
	},
	updateSize : function(){
		this.codeMirror.refresh();
	},
	redo : function(){
		return this.codeMirror.redo();
	},
	undo : function(){
		return this.codeMirror.undo();
	},
	historySize : function(){
		return this.codeMirror.doc.historySize();
	},
	//----------------------//

	render : function(){
		return <div className='codeEditor' ref='editor' style={this.props.style}/>;
	}
});

module.exports = CodeEditor;
