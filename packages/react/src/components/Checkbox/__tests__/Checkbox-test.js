/**
 * Copyright IBM Corp. 2016, 2023
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import Checkbox from '../Checkbox';

describe('Checkbox', () => {
  it('should set the `id` on the <input> element', () => {
    render(<Checkbox id="test" labelText="test-label" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('id', 'test');
  });

  it('should label the input by the given labelText', () => {
    render(<Checkbox id="test" labelText="test-label" />);
    expect(screen.getByLabelText('test-label')).toBeInTheDocument();
  });

  it('should use defaultChecked to set the default value of the <input> checkbox', () => {
    render(<Checkbox id="test" labelText="test-label" defaultChecked />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('should support a custom `className` prop on the outermost element', () => {
    const { container } = render(
      <Checkbox id="test" labelText="test-label" className="test" />
    );
    expect(container.firstChild).toHaveClass('test');
  });

  it('should support a `ref` that is placed on the <input> element', () => {
    const ref = jest.fn();
    render(<Checkbox id="test" labelText="test-label" ref={ref} />);
    expect(ref).toHaveBeenCalledWith(screen.getByRole('checkbox'));
  });

  it('should disable the <input> if disabled is provided as a prop', () => {
    const { rerender } = render(<Checkbox id="test" labelText="test-label" />);
    expect(screen.getByRole('checkbox')).toBeEnabled();

    rerender(<Checkbox id="test" labelText="test-label" disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('should set checked on the <input> if checked is provided as a prop', () => {
    render(<Checkbox id="test1" labelText="test-label-1" />);
    expect(screen.getByLabelText('test-label-1')).not.toBeChecked();

    render(<Checkbox id="test2" labelText="test-label-2" checked />);
    expect(screen.getByLabelText('test-label-2')).toBeChecked();
  });

  it('should hide the label if hideLabel is provided as a prop', () => {
    render(<Checkbox id="test" labelText="test-label" hideLabel />);
    expect(screen.getByText('test-label')).toHaveClass('cds--visually-hidden');
  });

  it('should call the `onChange` prop when the <input> value changes', () => {
    const onChange = jest.fn();
    render(<Checkbox id="test" labelText="test-label" onChange={onChange} />);

    userEvent.click(screen.getByLabelText('test-label'));

    expect(onChange).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'change',
      }),
      {
        checked: true,
        id: 'test',
      }
    );
  });

  it('should NOT call the `onChange` prop when readonly', () => {
    const onChange = jest.fn();
    const onClick = jest.fn();
    render(
      <Checkbox
        id="test"
        labelText="test-label"
        onChange={onChange}
        onClick={onClick}
        checked={false}
        readOnly={true}
      />
    );

    userEvent.click(screen.getByLabelText('test-label'));
    userEvent.click(screen.getByRole('checkbox'));
    expect(onClick).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
