const React = require('react');
const _ = require('lodash');
const Field = require('./field/field.jsx');

module.exports = function(CodeMirror) {
	return {
		cClass : (cm, n, prefix, cClass)=>{
			const { text } = cm.lineInfo(n);
			const id = `${_.kebabCase(prefix.replace('{{', ''))}-${_.kebabCase(cClass)}-${n}`;
			const frameChange = (e)=>{
				if(!!e.target && e.target.checked)
					cm.replaceRange(`,${cClass}`, CodeMirror.Pos(n, prefix.length), CodeMirror.Pos(n, prefix.length), '+insert');
				else {
					const start = text.indexOf(`,${cClass}`);
					if(start > -1)
						cm.replaceRange('', CodeMirror.Pos(n, start), CodeMirror.Pos(n, start + cClass.length + 1), '-delete');
					else
						e.target.checked = true;
				}
			};
			return <React.Fragment key={`${_.kebabCase(prefix)}-${cClass}-${n}`}>
				<input type='checkbox' id={id} onChange={frameChange} checked={_.includes(text, `,${cClass}`)}/>
				<label htmlFor={id}>{_.startCase(cClass)}</label>
			</React.Fragment>;
		},
		field : (cm, n, field)=>{
			if(!['number'].includes(field.type)) return null;
			const { text } = cm.lineInfo(n);

			const inputChange = (e)=>{
				const [_, fieldLabel, current] = text.match(field.pattern);
				let index = text.indexOf(`${fieldLabel}:${current}`);
				if(index === -1) return;
				index = index + 1 + field.name.length;
				cm.replaceRange(e.target.value, CodeMirror.Pos(n, index), CodeMirror.Pos(n, index + current.length), '+insert');
			};
			return <React.Fragment key={`${field.name}-${field.type}-${n}`}>
				<Field field={field} value={text.match(field.pattern)[2]} n={n} onChange={inputChange}/>
				{!!field.break ? <br/> : null}
			</React.Fragment>;
		}
	};
};