const React = require('react');
const ReactDOM = require('react-dom');
const _ = require('lodash');
const Field = require('../field/field.jsx');

module.exports = function(CodeMirror, widgets, cm) {
	const { cClass } = require('./widgetElements')(CodeMirror);
	const widgetOptions = widgets.map((widget)=>({
		name         : widget.name,
		pattern      : new RegExp(widget.pattern),
		createWidget : (n, node)=>{
			const parent = document.createElement('div');
			const classes = (widget.classes || []).map((c, i)=><React.Fragment key={`class${n}${i}`}>
				{cClass(cm, n, `{{${widget.name}`, c)}
			</React.Fragment>);

			const fields = (widget.fields || []).map((field, i)=>{
				if(!['number'].includes(field.type)) return null;
				const { text } = cm.lineInfo(n);

				const inputChange = (e)=>{
					const current = text.match(field.pattern)[1];
					let index = text.indexOf(`${field.name}:${current}`);
					if(index === -1) return;
					index = index + 1 + field.name.length;
					cm.replaceRange(e.target.value, CodeMirror.Pos(n, index), CodeMirror.Pos(n, index + current.length), '+insert');
				};
				return <Field field={field} value={text.match(field.pattern)[1]} n={n} onChange={inputChange} key={`${field.name}${n}${i}`}/>;
			}).filter((f)=>!!f);

			ReactDOM.render(<React.Fragment>
				{classes}
				{fields}
			</React.Fragment>, node || parent);

			return parent;
		}
	}));

	const updateLineWidgets = (n, remove)=>{
		const { text, widgets } =  cm.lineInfo(n);
		const widgetOption = widgetOptions.find((option)=>!!text.match(option.pattern));
		if(!widgetOption) return;
		if(!!widgets) {
			for (const widget of widgets) {
				widgetOption.createWidget(n, widget.node);
			}
		} else {
			cm.addLineWidget(n, widgetOption.createWidget(n), {
				above       : true,
				coverGutter : false,
				noHScroll   : true,
				className   : `snippet-options-widget ${widgetOption.name}-widget`
			});
		}
	};

	return {
		removeLineWidgets : (widget)=>{
			cm.removeLineWidget(widget);
		},
		updateLineWidgets,
		updateAllLineWidgets : ()=>{
			for (let i = 0; i < cm.lineCount(); i++) {
				const { widgets } = cm.lineInfo(i);
				if(!!widgets)
					updateLineWidgets(i);
			}
		},
		updateWidgetGutter : ()=>{
			cm.operation(()=>{
				for (let i = 0; i < cm.lineCount(); i++) {
					const line = cm.getLine(i);

					if(widgetOptions.some((option)=>line.match(option.pattern))) {
						const optionsMarker = document.createElement('div');
						optionsMarker.style.color = '#822';
						optionsMarker.innerHTML = '●';
						cm.setGutterMarker(i, 'widget-gutter', optionsMarker);
					} else {
						cm.setGutterMarker(i, 'widget-gutter', null);
					}
				}
			});
		}
	};
};