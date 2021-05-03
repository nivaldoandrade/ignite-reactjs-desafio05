import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { format } from 'date-fns';
import Prismic from '@prismicio/client';
import { ptBR } from 'date-fns/locale';
import { RichText } from 'prismic-dom';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();

  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  };

  const dateFormatted = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  );

  const timeToRead = useMemo(() => {
    const totalQuantityLetters = post.data.content.reduce((accumulator, contentItem) => {
      const totalLettersHeading = contentItem.heading
        ? contentItem.heading.split(' ').length
        : 0;
      const totalLettersBody = RichText.asText(contentItem.body).split(' ').length;

      return accumulator + totalLettersBody + totalLettersHeading;
    }, 0)

    return Math.ceil(totalQuantityLetters / 200);
  }, [post.data.content]);

  return (
    <>
      <Header />
      <section
        className={styles.banner}
        style={{
          backgroundImage: `url(${post.data.banner.url})`,
        }}
      />
      <main className={styles.container}>
        <section className={styles.titlePost}>
          <h1>{post.data.title}</h1>
          <span>
            <FiCalendar size={20} />
            {dateFormatted}
          </span>
          <span>
            <FiUser size={20} />
            {post.data.author}
          </span>
          <span>
            <FiClock size={20} />
            {timeToRead} min
          </span>
        </section>
        <section className={styles.contentPost}>
          {post.data.content.map(unit => (
            <article key={unit.heading}>
              <h1>{unit.heading}</h1>
              <div
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(unit.body),
                }}
              />
            </article>
          ))}
        </section>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    Prismic.Predicates.at('document.type', 'posts')
  );

  const paths = posts.results.map(post => ({
    params: { slug: post.uid }
  }));

  // TODO
  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const { slug } = context.params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', `${slug}`, {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url ?? '',
      },
      content: response.data.content.map(field => {
        return {
          heading: field.heading,
          body: field.body,
        };
      }),
    },
  };

  return {
    props: { post },
    revalidate: 60 * 60 * 1, // 1hours
  };
};
