const React = require('react');
const _ = require('lodash');
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
			return <React.Fragment>
				<input type='checkbox' id={id} onChange={frameChange} checked={_.includes(text, `,${cClass}`)}/>
				<label htmlFor={id}>{_.startCase(cClass)}</label>
			</React.Fragment>;
		}
	};
};