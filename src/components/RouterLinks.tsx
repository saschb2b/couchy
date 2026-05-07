import { createLink, type LinkComponent } from '@tanstack/react-router';
import Button, { type ButtonProps } from '@mui/material/Button';
import CardActionArea, { type CardActionAreaProps } from '@mui/material/CardActionArea';
import { forwardRef } from 'react';
import type { AnchorHTMLAttributes } from 'react';

type MUIButtonLinkProps = Omit<ButtonProps<'a'>, 'component' | 'href'> &
  AnchorHTMLAttributes<HTMLAnchorElement>;

const MUIButtonLink = forwardRef<HTMLAnchorElement, MUIButtonLinkProps>(
  function MUIButtonLink(props, ref) {
    return <Button component="a" ref={ref} {...props} />;
  },
);

export const ButtonLink: LinkComponent<typeof MUIButtonLink> = createLink(MUIButtonLink);

type MUICardActionAreaLinkProps = Omit<CardActionAreaProps<'a'>, 'component' | 'href'> &
  AnchorHTMLAttributes<HTMLAnchorElement>;

const MUICardActionAreaLink = forwardRef<HTMLAnchorElement, MUICardActionAreaLinkProps>(
  function MUICardActionAreaLink(props, ref) {
    return <CardActionArea component="a" ref={ref} {...props} />;
  },
);

export const CardActionAreaLink: LinkComponent<typeof MUICardActionAreaLink> =
  createLink(MUICardActionAreaLink);
